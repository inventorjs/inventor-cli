/**
 * instance processor
 */
import type {
  SlsInstance,
  SlsInstanceSrcLocal,
  SlsInstanceSrcCos,
  ResultInstance,
  MultiScfInstance,
  RunAction,
  RunOptions,
  SlsInstanceBaseInfo,
  ScfResultInstance,
  SlsConfig,
  OriginInstance,
  PartialRunOptions,
} from './types/index.js'
import path from 'node:path'
import fs from 'node:fs/promises'
import yaml from 'js-yaml'
import traverse from 'traverse'
import Graph from 'graph-data-structure'
import fg from 'fast-glob'
import JSZip, { file } from 'jszip'
import axios from 'axios'
import { interval } from 'rxjs'
import { ApiService } from './api.service.js'
import { reportStatus } from './decorators.js'
import {
  isFile,
  md5sum,
  getFileStatMap,
  sleep,
  filesize,
  isObject,
  type FileEntryContent,
} from './util.js'
import { RUN_STATUS, COMPONENT_SCF, COMPONENT_MULTI_SCF } from './constants.js'

export class InstanceService {
  private defaultRunOptions: RunOptions = {
    force: false,
    maxDeploySize: 500 * 1024 * 1024,
    pollTimeout: 600 * 1000,
    pollInterval: 200,
    followSymbolicLinks: false,
    resolveVar: 'env',
    reportStatus: async () => {},
    targets: [],
    deployType: 'all',
    devServer: {
      logsInterval: 1000,
      logsPeriod: 60 * 1000,
      logsQuery: '*',
      logWriter: (log: Record<string, unknown>) =>
        console.log(JSON.stringify(log)),
      updateDebounceTime: 1000,
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

  private getRegion(instance: SlsInstance) {
    return (instance.inputs.region ?? 'ap-guangzhou') as string
  }

  private getResultError(instance: SlsInstance, error: Error) {
    return {
      $instance: instance,
      $error: error,
    }
  }

  async resolveFile(instancePath: string) {
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

  isValid(instance?: SlsInstance) {
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

    if (instance) {
      if (!this.isValid(instance)) {
        throw new Error('current dir is not a valid serverless instance')
      }
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
        const { app, stage } = resolvedInstance
        if (!baseInfo) {
          baseInfo = { app, stage }
        }
        const { app: cApp, stage: cStage } = baseInfo
        if (cApp !== app || cStage !== stage) {
          throw new Error(`serverless instance's "app" "stage" must equal`)
        }
        instances.push(resolvedInstance)
      }
    }
    if (instances.length > 0) {
      instances = this.topologicalSort(instances, action)
    }
    if (options.deployType === 'code') {
      instances = instances.filter((instance) => instance.$src?.src)
    }
    return instances
  }

  resolveVariables(instance: OriginInstance, options: RunOptions) {
    const envRegex = /\$\{(env:)?([\w:\s.-]+)\}/g
    const outputRegex = /\$\{output:([\w:\s.-]+)\}/g
    let resolvedInstance = instance as SlsInstance
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
          let resolvedValue = instance[valName as keyof OriginInstance]
          resolvedValue = !isObject(resolvedValue) ? resolvedValue : v
          updateValue = updateValue.replace(v, resolvedValue)
        }
      })
      if (outputRegex.exec(updateValue)) {
        const depName = updateValue.split(':').at(-1)?.split('.')[0]
        if (depName && !resolvedInstance.$deps?.includes?.(depName)) {
          resolvedInstance.$deps ??= []
          resolvedInstance.$deps.push(depName)
        }
      }
      if (updateValue !== value) {
        this.update(updateValue)
      }
    })
    if (options.stage) {
      resolvedInstance.stage = options.stage
    }
    resolvedInstance.$src = this.getNormalSrc(resolvedInstance)
    return resolvedInstance
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

    return sortedInstances
  }

  async processSrcFiles(instance: SlsInstance, options: RunOptions) {
    const { Response } = await this.apiService.getCacheFileUrls(instance)
    const { changesUploadUrl, previousMapDownloadUrl, srcDownloadUrl } =
      Response
    let previousMap: Record<string, string> = {}
    let { force } = options
    if (!force) {
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

    // symbolicLink not support cache
    if (Object.values(fileStatMap).find(({ stats }) => stats?.isSymbolicLink())) {
      force = true
      previousMap = {}
    }

    const { zipBuffer, totalBytes, hasChanges } = await this.zipSrcLocalChanges(
      fileStatMap,
      previousMap,
      srcLocal,
      instance,
      options,
    )
    if (options.maxDeploySize && totalBytes > options.maxDeploySize) {
      throw new Error(
        `src files size exceed ${filesize(
          options.maxDeploySize,
        )} limit, can't deploy`,
      )
    }

    await this.uploadSrcFiles(changesUploadUrl, zipBuffer, instance, options)

    return { srcDownloadUrl, totalBytes, cacheOutdated: hasChanges, force }
  }

  @reportStatus(RUN_STATUS.uploadSrc)
  async uploadSrcFiles(
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
  async zipSrcLocalChanges(
    fileStatMap: Record<string, FileEntryContent>,
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
    for (const [file, { content, stats }] of fileStatEntries) {
      const filename = path.relative(srcLocal, file)
      const fileHash = md5sum(content)
      if (!previousMap[filename] || previousMap[filename] !== fileHash) {
        zip.file(filename, content, {
          unixPermissions: stats.mode,
        })
        zipFiles.push(filename)
        totalBytes += stats.size
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
  async getSrcLocalFileStatMap(instance: SlsInstance, options: RunOptions) {
    const normalSrc = instance.$src
    if (!normalSrc || !normalSrc.src) return null

    const srcPath = normalSrc.src
    const exclude = normalSrc?.exclude ?? []
    const include = normalSrc?.include ?? []
    const includeFiles = include.map((file) => path.resolve(srcPath, file))
    const excludeFiles = exclude.map((file) => path.resolve(srcPath, file))

    let globs = [`${srcPath}/**/*`]
    if (instance.component === COMPONENT_MULTI_SCF) {
      const multiScfInstance = instance as MultiScfInstance
      globs = Object.values(multiScfInstance.function).map(
        (functionConfig) => `${path.join(srcPath, functionConfig.src)}/**/*`,
      )
    }
    globs.push(...includeFiles)

    const fileStats = await fg(globs, {
      ignore: excludeFiles,
      dot: true,
      stats: true,
      onlyFiles: options.followSymbolicLinks,
      followSymbolicLinks: options.followSymbolicLinks,
    })

    if (!fileStats.length) return null

    const fileStatMap = await getFileStatMap(fileStats)

    return fileStatMap
  }

  async processDeploySrc(instance: SlsInstance, options: RunOptions) {
    const normalSrc = instance.$src
    let { force } = options
    if (!normalSrc) {
      return { instance, cacheOutdated: false, force }
    }
    const normalSrcOriginal = instance.$src as {
      srcOriginal: SlsInstanceSrcCos
    }
    let cacheOutdated = false
    if (normalSrc.src) {
      const {
        srcDownloadUrl,
        cacheOutdated: innerCacheOutdated,
        force: innerForce,
      } = await this.processSrcFiles(instance, options)
      cacheOutdated = innerCacheOutdated
      instance.inputs.src = srcDownloadUrl
      force = innerForce
    } else if (normalSrcOriginal.srcOriginal) {
      instance.inputs.srcOriginal = normalSrcOriginal.srcOriginal
      cacheOutdated = true
    }
    return { instance, cacheOutdated, force }
  }

  @reportStatus(RUN_STATUS.poll)
  async poll(instance: SlsInstance, options: RunOptions) {
    const { pollInterval, pollTimeout } = options

    const startTime = Date.now()
    do {
      try {
        const { Response } = await this.apiService.getInstance(instance)
        const { instanceStatus } = Response.instance as ResultInstance
        if (!pollInterval || !pollTimeout) {
          return Response.instance as ResultInstance
        }
        if (instanceStatus === 'deploying' || instanceStatus === 'removing') {
          await sleep(pollInterval)
        } else {
          return Response.instance as ResultInstance
        }
      } catch (err) {
        return this.getResultError(instance, err as Error)
      }
    } while (Date.now() - startTime < pollTimeout)
    throw new Error(`poll instance result timeout over ${options.pollTimeout}s`)
  }

  getRunOptions(options: PartialRunOptions) {
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
  async run(action: RunAction, instance: SlsInstance, options: RunOptions) {
    let runInstance = instance
    let cacheOutdated = false
    let { force } = options
    if (action === 'deploy') {
      if (options.deployType === 'config') {
        // use src cache
      } else if (
        options.deployType === 'code' &&
        instance.component === COMPONENT_SCF
      ) {
        return await this.updateFunctionCode(instance, options)
      } else {
        ;({
          instance: runInstance,
          cacheOutdated,
          force,
        } = await this.processDeploySrc(instance, options))
      }
    }
    try {
      await this.apiService.runComponent({
        instance: runInstance,
        method: action,
        options: {
          force,
          cacheOutdated,
        },
      })
      const pollResult = await this.poll(instance, options)
      return pollResult
    } catch (error) {
      return this.getResultError(instance, error as Error)
    }
  }

  @reportStatus(RUN_STATUS.updateCode)
  async updateFunctionCode(instance: SlsInstance, options: RunOptions) {
    const scfInstance = this.resolveVariables(instance, {
      ...options,
      resolveVar: 'all',
    })
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

    await this.apiService.updateFunctionCode(
      {
        Namespace: (scfInstance.inputs.namespace ?? 'default') as string,
        FunctionName: scfInstance.inputs.name as string,
        ZipFile: zipBuffer.toString('base64'),
      },
      this.getRegion(instance),
    )
    return this.poll(instance, options)
  }

  async pollFunctionLogs(instance: SlsInstance, options: RunOptions) {
    const instanceResult = (await this.poll(
      instance,
      options,
    )) as ScfResultInstance
    if (!instanceResult) {
      return
    }
    const topicId = instanceResult.state.function.ClsTopicId
    let tailMd5 = ''

    interval(options.devServer.logsInterval).subscribe(async () => {
      const { Results } = await this.apiService.searchLog(
        {
          TopicId: topicId,
          From: Date.now() - options.devServer.logsPeriod,
          To: Date.now(),
          Sort: 'asc',
          Query: options.devServer.logsQuery,
        },
        this.getRegion(instance),
      )

      let results = Results?.map((item) => ({
        ...item,
        $md5: md5sum(item.LogJson),
      }))

      const md5Index = results?.findIndex((item) => item.$md5 === tailMd5) ?? -1
      if (results && md5Index > -1) {
        results = results.slice(md5Index + 1)
      }
      tailMd5 = results?.at(-1)?.$md5 ?? tailMd5
      results?.forEach((item) =>
        options.devServer.logWriter(JSON.parse(item.LogJson)),
      )
    })
  }
}
