/**
 * instance processer
 */
import type {
  SlsInstance,
  SlsInstanceSrcLocal,
  SlsInstanceSrcCos,
  ResultInstance,
  RunAction,
  RunOptions,
  SlsInstanceBaseInfo,
  ScfResultInstance,
} from './types/index.js'
import { scf, cls } from 'tencentcloud-sdk-nodejs'
import path from 'node:path'
import fs from 'node:fs/promises'
import yaml from 'js-yaml'
import traverse from 'traverse'
import Graph from 'graph-data-structure'
import fg from 'fast-glob'
import JSZip from 'jszip'
import axios from 'axios'
import chokidar from 'chokidar'
import { Observable, debounceTime, interval } from 'rxjs'
import { ApiService, type ListInstancesParams } from './api.service.js'
import { reportStatus } from './decorators.js'
import {
  isFile,
  md5sum,
  getFileStatMap,
  sleep,
  filesize,
  isObject,
  type FileStat,
} from './util.js'
import { RUN_STATUS, COMPONENT_SCF } from './constants.js'

const ScfClient = scf.v20180416.Client
const ClsClient = cls.v20201016.Client

export interface SlsConfig {
  slsPath: string
  appId: string
  secretId: string
  secretKey: string
  token?: string
}

export class InstanceService {
  private defaultRunOptions: RunOptions = {
    force: false,
    maxDeploySize: 500 * 1024 * 1024, // 500M
    pollTimeout: 600 * 1000, // 300s
    pollInterval: 200, // 200ms
    followSymbolicLinks: false,
    resolveVar: 'env',
    reportStatus: () => {},
    targets: [],
    deployType: 'all',
    devServer: {
      logsPollInterval: 1000,
      logsPeriod: 60 * 1000,
      logsQuery: '*',
      updateDebounceTime: 200,
    },
  }
  private supportFilenames = [
    'serverless.yml',
    'serverless.yaml',
    'serverless.json',
    'serverless.js',
  ]

  private apiService: ApiService

  constructor(private readonly config: SlsConfig) {
    this.apiService = new ApiService(config)
  }

  private getScfClient(instance: SlsInstance) {
    return new ScfClient({
      credential: {
        secretId: this.config.secretId,
        secretKey: this.config.secretKey,
        token: this.config.token,
      },
      region: (instance.inputs.region ?? 'ap-guangzhou') as string,
    })
  }

  private getClsClient(instance: SlsInstance) {
    return new ClsClient({
      credential: {
        secretId: this.config.secretId,
        secretKey: this.config.secretKey,
        token: this.config.token,
      },
      region: (instance.inputs.region ?? 'ap-guangzhou') as string,
    })
  }

  private async resolveFile(instancePath: string) {
    for (const filename of this.supportFilenames) {
      const filePath = path.join(instancePath, filename)
      if (!(await isFile(filePath))) continue
      const content = await fs.readFile(filePath, 'utf8')
      let instance: SlsInstance | null = null
      if (filename.endsWith('yml') || filename.endsWith('yaml')) {
        try {
          instance = yaml.load(content) as SlsInstance
        } catch (err) {
          return null
        }
      } else if (filename.endsWith('json')) {
        try {
          instance = JSON.parse(content)
        } catch (err) {
          return null
        }
      } else {
        ;({ default: instance } = await import(filePath))
      }
      if (instance) {
        instance.$path = path.dirname(filePath)
      }
      return instance
    }
    return null
  }

  private isValid(instance?: SlsInstance) {
    if (
      !instance ||
      !instance.app ||
      typeof instance.app !== 'string' ||
      !instance.stage ||
      typeof instance.stage !== 'string' ||
      !instance.name ||
      typeof instance.name !== 'string' ||
      !instance.component ||
      typeof instance.component !== 'string'
    ) {
      return false
    }
    return true
  }

  @reportStatus(RUN_STATUS.resolve)
  async resolve(action: RunAction, options: RunOptions) {
    const instance = await this.resolveFile(this.config.slsPath)
    if (instance && this.isValid(instance)) {
      const resolvedInstance = this.resolveVariables(instance, options)
      return [resolvedInstance]
    }

    let dirs = await fs.readdir(this.config.slsPath)
    if (options.targets.length > 0) {
      dirs = dirs.filter((dir) => options.targets.includes(dir))
    }
    let instances = []
    let baseInfo: SlsInstanceBaseInfo | null = null
    for (const dir of dirs) {
      const instancePath = path.resolve(this.config.slsPath, dir)
      const instance = await this.resolveFile(instancePath)
      if (instance && !this.isValid(instance)) {
        throw new Error(`${dir} is not a valid serverless instance`)
      }
      if (instance) {
        const resolvedInstance = this.resolveVariables(instance, options)
        const { org, app, stage } = resolvedInstance
        if (!baseInfo) {
          baseInfo = { org, app, stage }
        }
        const { org: cOrg, app: cApp, stage: cStage } = baseInfo
        if (cOrg !== org || cApp !== app || cStage !== stage) {
          throw new Error(
            `serverless instance's "org" "app" "stage" must equal`,
          )
        }
        instances.push(resolvedInstance)
      }
    }
    instances = this.topologicalSort(instances, action)
    return instances
  }

  private resolveVariables(instance: SlsInstance, options: RunOptions) {
    const envRegex = /\$\{(env:)?([\w:\s.-]+)\}/g
    const outputRegex = /\$\{output:([\w:\s.-]+)\}/g
    traverse(instance).forEach(function (value) {
      let updateValue = value
      if (typeof value !== 'string') return
      updateValue.match(envRegex)?.forEach((v: string) => {
        envRegex.lastIndex = 0
        let [, envPrefix, valName] = envRegex.exec(v) ?? []
        valName = valName.trim()
        let resolvedValue = v
        if (envPrefix) {
          resolvedValue = process.env[valName] ?? value
          updateValue = updateValue.replace(v, resolvedValue)
        } else if (options.resolveVar === 'all') {
          let resolvedValue = instance[valName as keyof SlsInstance]
          resolvedValue = !isObject(resolvedValue) ? resolvedValue : v
          updateValue = updateValue.replace(v, resolvedValue)
        }
      })
      if (outputRegex.exec(updateValue)) {
        const depName = updateValue.split(':').at(-1)?.split('.')[0]
        if (depName && !instance.$deps?.includes?.(depName)) {
          instance.$deps ??= []
          instance.$deps.push(depName)
        }
      }
      if (updateValue !== value) {
        this.update(updateValue)
      }
    })
    instance.$src = this.getNormalSrc(instance)
    return instance
  }

  private topologicalSort(instances: SlsInstance[], action: RunAction) {
    const graph = Graph()

    instances.forEach((instance) => {
      graph.addNode(instance.name)
      instance?.$deps?.forEach((depInstanceName) => {
        graph.addEdge(instance.name, depInstanceName)
      })
    })

    if (graph.hasCycle()) {
      throw new Error(
        'instance has circular dependencies, please check ${output:...} config',
      )
    }

    let sortedList = graph.topologicalSort()
    if (!['remove'].includes(action)) {
      sortedList = sortedList.reverse()
    }
    const sortedInstances: SlsInstance[] = []
    sortedList.forEach((instanceName) => {
      const instance = instances.find(
        (instance) => instance.name === instanceName,
      )
      if (instance) {
        sortedInstances.push(instance)
      }
    })

    return instances
  }

  private async processSrcFiles(instance: SlsInstance, options: RunOptions) {
    const { Response } = await this.apiService.getCacheFileUrls(instance)
    const { changesUploadUrl, previousMapDownloadUrl, srcDownloadUrl } =
      Response
    let previousMap: Record<string, string> = {}
    if (!options.force) {
      try {
        previousMap = await axios
          .get(previousMapDownloadUrl)
          .then((res) => res.data)
      } catch (err) {
        //
      }
    }
    if (!instance.$src) {
      throw new Error('src config not exists')
    }
    const srcLocal = instance.$src.src
    const fileStatMap = await this.getSrcLocalFileStatMap(instance, options)

    if (!fileStatMap || !srcLocal) {
      throw new Error('there is no src files to zip')
    }
    const zipResult = await this.zipSrcLocalChanges(
      fileStatMap,
      previousMap,
      srcLocal,
      instance,
      options,
    )
    if (!zipResult) {
      throw new Error('zip result is empty')
    }
    const { zipBuffer, totalBytes, hasChanges } = zipResult
    if (options.maxDeploySize && totalBytes > options.maxDeploySize) {
      throw new Error(
        `src files size exceed ${filesize(
          options.maxDeploySize,
        )} limit, can't deploy`,
      )
    }

    await this.uploadSrcFiles(changesUploadUrl, zipBuffer, instance, options)

    return { srcDownloadUrl, totalBytes, cacheOutdated: hasChanges }
  }

  @reportStatus(RUN_STATUS.uploadSrc)
  private async uploadSrcFiles(
    uploadUrl: string,
    buffer: Buffer,
    _instance: SlsInstance,
    _options: RunOptions,
  ) {
    return axios.put(uploadUrl, buffer)
  }

  private getNormalSrc(instance: SlsInstance) {
    const src = instance.inputs.src
    if (!src) {
      return null
    }
    const srcLocal = src as SlsInstanceSrcLocal
    const srcCos = src as SlsInstanceSrcCos
    if (typeof src === 'string') {
      return { src: path.resolve(instance.$path, src) }
    } else if (typeof srcLocal.src === 'string') {
      return { ...srcLocal, src: path.resolve(instance.$path, srcLocal.src) }
    } else if (
      typeof srcCos.bucket === 'string' &&
      typeof srcCos.object === 'string'
    ) {
      return { src: null, srcOriginal: srcCos }
    }
    return { src: null }
  }

  @reportStatus(RUN_STATUS.compressSrc)
  private async zipSrcLocalChanges(
    fileStatMap: Record<string, FileStat>,
    previousMap: Record<string, string>,
    srcLocal: string,
    _instance: SlsInstance,
    _options: RunOptions,
  ) {
    const cacheMap: Record<string, string> = {}
    const zip = new JSZip()
    let totalBytes = 0
    const zipFiles = []
    const fileStatEntries = Object.entries(fileStatMap)
    for (const [file, { content, stat }] of fileStatEntries) {
      const filename = path.relative(srcLocal, file)
      const fileHash = md5sum(content)
      if (!previousMap[filename] || previousMap[filename] !== fileHash) {
        zip.file(filename, content, {
          unixPermissions: stat.mode,
        })
        zipFiles.push(filename)
        totalBytes += stat.size
      }
      cacheMap[filename] = fileHash
    }

    const filesToDelete = Object.keys(previousMap).filter(
      (filename) => !cacheMap[filename],
    )

    zip.file('src.map', Buffer.from(JSON.stringify(cacheMap)))
    zip.file('deleted.files', Buffer.from(JSON.stringify(filesToDelete)))

    const hasChanges = zipFiles.length > 0 || filesToDelete.length > 0

    const zipBuffer = await zip.generateAsync({
      platform: 'UNIX',
      type: 'nodebuffer',
    })

    return {
      totalBytes,
      zipBuffer,
      zipFiles,
      hasChanges,
    }
  }

  @reportStatus(RUN_STATUS.readSrc)
  private async getSrcLocalFileStatMap(
    instance: SlsInstance,
    options: RunOptions,
  ) {
    const normalSrc = instance.$src
    if (!normalSrc || !normalSrc.src) return null

    const srcPath = normalSrc.src
    const exclude = normalSrc?.exclude ?? []
    const files = await fg(`${srcPath}/**/*`, {
      ignore: exclude,
      dot: true,
      onlyFiles: options.followSymbolicLinks,
      followSymbolicLinks: options.followSymbolicLinks,
    })

    const include = normalSrc?.include ?? []
    include.forEach((file) => files.push(path.resolve(srcPath, file)))
    if (!files.length) return null

    const fileStatMap = await getFileStatMap(files)

    return fileStatMap
  }

  private async processDeploySrc(instance: SlsInstance, options: RunOptions) {
    const normalSrc = instance.$src
    if (!normalSrc) {
      return { instance, cacheOutdated: false }
    }
    const normalSrcOriginal = instance.$src as {
      srcOriginal: SlsInstanceSrcCos
    }
    let cacheOutdated = false
    if (normalSrc.src) {
      const { srcDownloadUrl, cacheOutdated: innerCacheOutdated } =
        await this.processSrcFiles(instance, options)
      cacheOutdated = innerCacheOutdated
      instance.inputs.src = srcDownloadUrl
    } else if (normalSrcOriginal.srcOriginal) {
      instance.inputs.srcOriginal = normalSrcOriginal.srcOriginal
      cacheOutdated = true
    }
    return { instance, cacheOutdated }
  }

  @reportStatus(RUN_STATUS.poll)
  private async poll(
    instance: SlsInstance,
    options: RunOptions,
  ): Promise<ResultInstance | null> {
    const { pollInterval, pollTimeout } = options

    const startTime = Date.now()
    do {
      const { Response } = await this.apiService.getInstance(instance)
      const { instanceStatus } = Response.instance as ResultInstance
      if (!pollInterval || !pollTimeout) {
        return Response.instance
      }
      if (instanceStatus === 'deploying' || instanceStatus === 'removing') {
        await sleep(pollInterval)
      } else {
        return Response.instance
      }
    } while (Date.now() - startTime < pollTimeout)
    throw new Error(`poll instance result timeout over ${options.pollTimeout}s`)
  }

  private getRunOptions(options: Partial<RunOptions>) {
    const runOptions = Object.assign({}, this.defaultRunOptions, options, {
      devServer: Object.assign(
        {},
        this.defaultRunOptions.devServer,
        options.devServer,
      ),
    }) as RunOptions
    return runOptions
  }

  @reportStatus(RUN_STATUS.run)
  private async run(
    action: RunAction,
    instance: SlsInstance,
    options: RunOptions,
  ) {
    let runInstance = instance
    let cacheOutdated = false
    if (action === 'deploy') {
      if (options.deployType === 'config') {
        // use src cache
      } else if (options.deployType === 'src' && instance.component === COMPONENT_SCF) {
        return await this.updateFunctionCode(instance, options)
      } else {
        ;({ instance: runInstance, cacheOutdated } =
          await this.processDeploySrc(instance, options))
      }
    }
    try {
      const runResult = await this.apiService.runComponent({
        instance: runInstance,
        method: action,
        options: {
          force: options.force,
          cacheOutdated,
        },
      })
      if (!options.pollTimeout || !options.pollInterval) {
        return runResult.Response
      }
      const pollResult = await this.poll(instance, options)
      return pollResult
    } catch (err) {
      return err
    }
  }

  private async runAll(action: RunAction, options: Partial<RunOptions> = {}) {
    const runOptions = this.getRunOptions(options)
    const resolvedInstances = await this.resolve(action, runOptions)
    if (!resolvedInstances?.length) {
      throw new Error(`there is no serverless instance to ${action}`)
    }

    const runResults: Array<ResultInstance | null> = []
    for (const instance of resolvedInstances) {
      runResults.push(await this.run(action, instance, runOptions))
    }
    return runResults
  }

  @reportStatus(RUN_STATUS.uploadSrc)
  private async updateFunctionCode(instance: SlsInstance, options: RunOptions) {
    const scfInstance = this.resolveVariables(instance, { ...options, resolveVar: 'all' })
    const srcLocal = instance.$src?.src
    const fileStatMap = await this.getSrcLocalFileStatMap(instance, options)

    if (!fileStatMap || !srcLocal) {
      throw new Error('there is no src files to zip')
    }
    const { zipBuffer } = await this.zipSrcLocalChanges(
      fileStatMap,
      {},
      srcLocal,
      instance,
      options,
    )

    await this.getScfClient(instance).UpdateFunctionCode({
      Namespace: (scfInstance.inputs.namespace ?? 'default') as string,
      FunctionName: scfInstance.inputs.name as string,
      ZipFile: zipBuffer.toString('base64'),
    })
    return this.poll(instance, options)
  }

  private async pollFunctionLogs(instance: SlsInstance, options: RunOptions) {
    const instanceResult = (await this.poll(
      instance,
      options,
    )) as ScfResultInstance
    if (!instanceResult) {
      return
    }
    const topicId = instanceResult.state.function.ClsTopicId
    let tailMd5 = ''

    interval(options.devServer.logsPollInterval).subscribe(async () => {
      const { Results } = await this.getClsClient(instance).SearchLog({
        TopicId: topicId,
        From: Date.now() - options.devServer.logsPeriod,
        To: Date.now(),
        Sort: 'asc',
        Query: options.devServer.logsQuery,
      })

      let results = Results?.map((item) => ({
        ...item,
        $md5: md5sum(item.LogJson),
      }))

      const md5Index = results?.findIndex((item) => item.$md5 === tailMd5) ?? -1
      if (results && md5Index > -1) {
        results = results.slice(md5Index + 1)
      }
      tailMd5 = results?.at(-1)?.$md5 ?? tailMd5

      results?.forEach((item) => console.log(item.LogJson))
    })
  }

  private async getScfInstances(options: RunOptions) {
    const resolvedInstances = await this.resolve('deploy', options)
    const scfInstances = resolvedInstances?.filter?.(
      (instance) => instance.component === COMPONENT_SCF,
    )
    if (!scfInstances?.length) {
      throw new Error('there is no scf instance to update')
    }
    return scfInstances
  }

  async deploy(options: Partial<RunOptions> = {}) {
    return this.runAll('deploy', options)
  }

  async remove(options: Partial<RunOptions> = {}) {
    return this.runAll('remove', options)
  }

  async info(options: Partial<RunOptions> = {}) {
    const runOptions = this.getRunOptions(options)
    const resolvedInstances = await this.resolve('deploy', runOptions)
    if (!resolvedInstances.length) {
      throw new Error('there is no serverless instance to show')
    }

    const infoOptions = {
      ...runOptions,
      pollInterval: 0,
      pollTimeout: 0,
    }

    const infoPromises = resolvedInstances.map((instance) =>
      this.poll(instance, infoOptions).catch((err) => err),
    )
    const resultList = await Promise.all(infoPromises)
    const infoList = resultList.map((result) =>
      result instanceof Error ? result : result,
    ) as Array<ResultInstance | Error>

    return infoList
  }

  async list(params: ListInstancesParams = {}) {
    const result = await this.apiService.listInstances(params)
    return result.Response?.instances
  }

  async dev(options: Partial<RunOptions> = {}) {
    const runOptions = this.getRunOptions(options)
    const scfInstances = await this.getScfInstances(runOptions)
    for (const instance of scfInstances) {
      const src = instance.$src?.src
      if (!src) continue
      const watcher = chokidar.watch(src)
      const watch$ = new Observable<{ event: string; file: string }>(
        (observer) => {
          watcher.on('all', async (event, file) => {
            observer.next({ event, file })
          })
        },
      )
      watch$
        .pipe(debounceTime(runOptions.devServer.updateDebounceTime))
        .subscribe(() => {
          this.updateFunctionCode(instance, runOptions)
        })
      this.pollFunctionLogs(instance, runOptions)
    }
  }

  async logs(options: Partial<RunOptions> = {}) {
    const runOptions = this.getRunOptions(options)
    const scfInstances = await this.getScfInstances(runOptions)

    for (const instance of scfInstances) {
      this.pollFunctionLogs(instance, runOptions)
    }
  }
}
