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
  ScfResultInstance,
  SlsConfig,
  PartialRunOptions,
  TransInstance,
  ScfLogRecord,
} from '../types/index.js'
import path from 'node:path'
import fg from 'fast-glob'
import JSZip from 'jszip'
import axios from 'axios'
import { interval } from 'rxjs'
import { ApiService } from './api.service.js'
import { reportStatus } from '../decorators.js'
import {
  md5sum,
  getFilesStatsContent,
  sleep,
  filesize,
  isObject,
  type FileStatsContent,
} from '../util.js'
import { RUN_STATUS, COMPONENT_SCF, COMPONENT_MULTI_SCF } from '../constants.js'
import { NoSrcConfigError, NoSrcFilesError } from '../errors.js'

export type ListInstanceParams = Partial<
  Pick<SlsInstance, 'org' | 'stage'>
> & { apps?: string[]; names?: string[]; components?: string[]; stages?: string[] }

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
      logsVerbose: false,
      logsWriter: (log: Record<string, unknown>) =>
        console.log(JSON.stringify(log)),
      updateDebounceTime: 100,
    },
  }

  private apiService: ApiService

  constructor(private readonly config: SlsConfig) {
    this.apiService = new ApiService(this.config)
  }

  private getRegion(instance: SlsInstance) {
    return (instance.inputs.region ?? 'ap-guangzhou') as string
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
        )} 最大限制, 无法完成部署，请优化源代码体积\n 部署生产版本 node_modules\n源代码拆分等`,
      )
    }

    await axios.put(changesUploadUrl, zipBuffer)

    return { srcDownloadUrl, totalBytes, cacheOutdated: hasChanges, force }
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
      let filename = path.relative(srcLocal, filePath)
      if (filename.startsWith('..')) {
        filename = path.basename(filename)
      }
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
        const logs = options.devServer.logsVerbose
          ? logsObj
          : this.cleanLogs(logsObj)
        if (!logs) return

        options.devServer.logsWriter(logs)
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
      transInstance.orgName = await this.apiService.getAppId()
    }

    return transInstance
  }

  async list(params: ListInstanceParams) {
    const { org, stages, apps, names, components } = params
    const result = await this.apiService.listInstances({
      orgName: org,
      stageNames: stages,
      appNames: apps,
      instanceNames: names,
      componentNames: components,
    })
    return result.Response?.instances
  }
}
