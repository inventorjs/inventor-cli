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
  MultiInstance,
  TransInstance,
  ScfLogRecord,
} from './types/index.js'
import path from 'node:path'
import fs from 'node:fs/promises'
import yaml from 'js-yaml'
import traverse from 'traverse'
import Graph from 'graph-data-structure'
import fg from 'fast-glob'
import JSZip from 'jszip'
import axios from 'axios'
import { interval } from 'rxjs'
import { ApiService } from './api.service.js'
import { reportStatus } from './decorators.js'
import {
  isFile,
  md5sum,
  getFilesStatsContent,
  sleep,
  filesize,
  isObject,
  type FileStatsContent,
} from './util.js'
import { RUN_STATUS, COMPONENT_SCF, COMPONENT_MULTI_SCF } from './constants.js'
import { CircularError, NoSrcConfigError, NoSrcFilesError } from './errors.js'

export type ListInstanceParams = Partial<
  Pick<SlsInstance, 'org' | 'app' | 'name' | 'component'>
>

export class InstanceService {
  private defaultRunOptions: RunOptions = {
    force: false,
    maxDeploySize: 500 * 1024 * 1024,
    pollTimeout: 600 * 1000,
    pollInterval: 200,
    followSymbolicLinks: false,
    resolveVar: 'env',
    reportStatus: async () => { },
    targets: [],
    inputs: {},
    deployType: 'all',
    devServer: {
      logsInterval: 500,
      logsPeriod: 60 * 1000,
      logsQuery: '*',
      logsClean: false,
      logsWriter: (log: Record<string, unknown>) =>
        console.log(JSON.stringify(log)),
      updateDebounceTime: 100,
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

  async resolveFile(instancePath: string) {
    for (const filename of this.supportFilenames) {
      const filePath = path.join(instancePath, filename)
      if (!(await isFile(filePath))) continue
      const content = await fs.readFile(filePath, 'utf8')
      let instance: SlsInstance | MultiInstance | null = null
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
        ; ({ default: instance } = await import(filePath))
      }
      if (instance) {
        instance.$path = path.dirname(filePath)
      }
      return instance
    }
    return null
  }

  isInstance(instance?: SlsInstance) {
    if (
      instance &&
      typeof instance.app === 'string' &&
      typeof instance.stage === 'string' &&
      typeof instance.name === 'string' &&
      typeof instance.component === 'string'
    ) {
      return true
    }
    return false
  }

  isMultiInstance(instance?: MultiInstance) {
    if (
      instance &&
      typeof instance.app === 'string' &&
      typeof instance.stage === 'string' &&
      isObject(instance.instances)
    ) {
      return true
    }
    return false
  }

  resolveMultiInstance(multiInstance: MultiInstance, options: RunOptions) {
    let instances = Object.entries(multiInstance.instances).map(
      ([name, instance]) => {
        const resolvedInstance = this.resolveVariables(
          {
            ...instance,
            name,
            app: multiInstance.app,
            stage: multiInstance.stage,
            org: multiInstance.org,
            $path: multiInstance.$path,
          },
          options,
        )
        return resolvedInstance
      },
    )
    if (options.targets.length > 0) {
      instances = instances.filter((instance) =>
        options.targets.includes(instance.name),
      )
    }
    return instances
  }

  async resolveDirInstance(options: RunOptions) {
    let instances: SlsInstance[] = []
    let dirs = await fs.readdir(this.config.slsPath)
    if (options.targets.length > 0) {
      dirs = dirs.filter((dir) => options.targets.includes(dir))
    }
    let baseInfo: SlsInstanceBaseInfo | null = null
    for (const dir of dirs) {
      const instancePath = path.resolve(this.config.slsPath, dir)
      const instance = (await this.resolveFile(instancePath)) as SlsInstance
      if (!instance || !this.isInstance(instance)) {
        continue
      }
      const resolvedInstance = this.resolveVariables(instance, options)
      const { app, stage, org } = resolvedInstance
      if (!baseInfo) {
        baseInfo = { app, stage, org }
      }
      const { app: cApp, stage: cStage, org: cOrg } = baseInfo
      if (cApp !== app || cStage !== stage || cOrg !== org) {
        throw new Error(`serverless 应用的 "org" "app" 和 "stage" 配置必须一致`)
      }
      instances.push(resolvedInstance)
    }
    return instances
  }

  resolveSingleInstance(instance: SlsInstance, options: RunOptions) {
    const resolvedInstance = this.resolveVariables(instance, options)
    return [resolvedInstance]
  }

  @reportStatus(RUN_STATUS.resolve)
  async resolve(action: RunAction, options: RunOptions) {
    const ins = await this.resolveFile(this.config.slsPath)
    const multiInstance = ins as MultiInstance
    const instance = ins as SlsInstance
    let instances: SlsInstance[] = []

    if (this.isInstance(instance)) {
      instances = this.resolveSingleInstance(instance, options)
    } else if (this.isMultiInstance(multiInstance)) {
      instances = this.resolveMultiInstance(multiInstance, options)
    } else {
      instances = await this.resolveDirInstance(options)
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
    const outputRegex = /\$\{output:([\w:\s.${}-]+)\}/g
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
    if (Object.keys(options.inputs).length > 0) {
      Object.assign(resolvedInstance.inputs, options.inputs)
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
      throw new CircularError()
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

  @reportStatus(RUN_STATUS.updateCode)
  async processSrcFiles(instance: SlsInstance, options: RunOptions) {
    const { Response } = await this.apiService.getCacheFileUrls(
      await this.transInstance(instance),
    )
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
    const srcLocal = instance.$src?.src
    if (!srcLocal) {
      throw new NoSrcConfigError()
    }

    const filesStatsContent = await this.getSrcLocalFilesStatsContent(
      instance,
      options,
    )

    if (!filesStatsContent?.length) {
      throw new NoSrcFilesError()
    }

    // symbolicLink not support cache
    if (filesStatsContent.find(({ stats }) => stats?.isSymbolicLink())) {
      force = true
      previousMap = {}
    }

    const { zipBuffer, totalBytes, hasChanges } = await this.zipSrcLocalChanges(
      filesStatsContent,
      previousMap,
      srcLocal,
      instance,
      options,
    )
    if (options.maxDeploySize && totalBytes > options.maxDeploySize) {
      throw new Error(
        `源代码文件总体积超过 ${filesize(
          options.maxDeploySize,
        )} 最大限制, 无法完成部署`,
      )
    }

    await this.uploadSrcFiles(changesUploadUrl, zipBuffer, instance, options)

    return { srcDownloadUrl, totalBytes, cacheOutdated: hasChanges, force }
  }

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

  async zipSrcLocalChanges(
    filesStatStatContent: FileStatsContent[],
    previousMap: Record<string, string>,
    srcLocal: string,
    _instance: SlsInstance,
    _options: RunOptions,
  ) {
    const cacheMap: Record<string, string> = {}
    const zip = new JSZip()
    let totalBytes = 0
    const zipFiles = []
    for (const { content, stats, path: filePath } of filesStatStatContent) {
      const filename = path.relative(srcLocal, filePath)
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

  async getSrcLocalFilesStatsContent(
    instance: SlsInstance,
    options: RunOptions,
  ) {
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
      globs = Object.values(multiScfInstance.inputs.functions).map(
        (functionConfig) => `${path.join(srcPath, functionConfig.src)}/**/*`,
      )
    }
    globs.push(...includeFiles)

    const files = await fg(globs, {
      ignore: excludeFiles,
      dot: true,
      onlyFiles: options.followSymbolicLinks,
      followSymbolicLinks: options.followSymbolicLinks,
    })

    if (!files.length) return []

    const filesStatContents = await getFilesStatsContent(files)

    return filesStatContents
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
      const { Response } = await this.apiService.getInstance(
        await this.transInstance(instance),
      )
      const { instanceStatus } = Response.instance as ResultInstance
      if (!pollInterval || !pollTimeout) {
        return Response.instance as ResultInstance
      }
      if (instanceStatus.endsWith('ing')) {
        await sleep(pollInterval)
      } else {
        return Response.instance as ResultInstance
      }
    } while (Date.now() - startTime < pollTimeout)
    throw new Error(`拉取实例状态超时 ${options.pollTimeout}毫秒`)
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
        return this.updateFunctionCode(instance, options)
      } else {
        ; ({
          instance: runInstance,
          cacheOutdated,
          force,
        } = await this.processDeploySrc(instance, options))
      }
    }
    return this.apiService.runComponent({
      instance: await this.transInstance(runInstance),
      method: action,
      options: {
        force,
        cacheOutdated,
      },
    })
  }

  @reportStatus(RUN_STATUS.updateCode)
  async updateFunctionCode(instance: SlsInstance, options: RunOptions) {
    const srcLocal = instance.$src?.src
    if (!srcLocal) {
      throw new NoSrcConfigError()
    }

    const filesStatsContent = await this.getSrcLocalFilesStatsContent(
      instance,
      options,
    )

    if (!filesStatsContent?.length) {
      throw new NoSrcFilesError()
    }

    const { zipBuffer } = await this.zipSrcLocalChanges(
      filesStatsContent,
      {},
      srcLocal,
      instance,
      options,
    )

    return await this.apiService.updateFunctionCode(
      {
        Namespace: instance.inputs.namespace as string,
        FunctionName: instance.inputs.name as string,
        ZipFile: zipBuffer.toString('base64'),
      },
      this.getRegion(instance),
    )
  }

  cleanLogs(logsObj: ScfLogRecord | null) {
    if (!logsObj || !isObject(logsObj)) {
      return null
    }
    if (
      logsObj.SCF_Type === 'Platform' &&
      !logsObj.SCF_Message.startsWith('ERROR RequestId:')
    ) {
      return null
    }

    const resultObj = Object.keys(logsObj).reduce((result, logKey) => {
      if (
        logKey.startsWith('SCF_') &&
        ![
          'SCF_FunctionName',
          'SCF_RequestId',
          'SCF_StatusCode',
          'SCF_Message',
        ].includes(logKey)
      ) {
        return result
      }
      return { ...result, [logKey]: logsObj[logKey] }
    }, {})

    return resultObj
  }

  async pollFunctionLogs(instance: SlsInstance, options: RunOptions) {
    const instanceResult = (await this.poll(
      instance,
      options,
    )) as ScfResultInstance

    const topicId = instanceResult.inputs.cls.topicId
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
      results?.forEach((item) => {
        let logsObj: ScfLogRecord | null = null
        try {
          logsObj = JSON.parse(item.LogJson)
        } catch (err) {
          //
        }
        const cleanLogs = options.devServer.logsClean
          ? this.cleanLogs(logsObj)
          : logsObj
        if (!cleanLogs) return

        options.devServer.logsWriter(cleanLogs)
      })
    })
  }

  async transInstance(instance: SlsInstance) {
    const transInstance = Object.entries(instance).reduce<TransInstance>(
      (result, pair) => {
        const [key, val] = pair
        if (key === 'org') {
          return {
            ...result,
            orgName: val,
          }
        }
        if (key === 'app') {
          return {
            ...result,
            appName: val,
          }
        }
        if (key === 'stage') {
          return {
            ...result,
            stageName: val,
          }
        }
        if (key === 'name') {
          return {
            ...result,
            instanceName: val,
          }
        }
        if (key === 'component') {
          const [componentName, componentVersion = ''] = String(val).split('@')
          return {
            ...result,
            componentName,
            componentVersion,
          }
        }
        if (['inputs'].includes(key)) {
          return { ...result, [key]: val }
        }
        return result
      },
      {
        orgName: '',
        appName: '',
        stageName: '',
        componentName: '',
        instanceName: '',
        inputs: {},
      },
    )
    if (!transInstance.orgName) {
      transInstance.appName = await this.apiService.getAppId()
    }

    return transInstance
  }

  async list(params: ListInstanceParams) {
    const { org, app, name, component } = params
    const result = await this.apiService.listInstances({
      orgName: org,
      appName: app,
      instanceName: name,
      componentName: component,
    })
    return result.Response?.instances
  }
}
