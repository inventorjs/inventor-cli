/**
 * instance processer
 */
import type {
  SlsInstance,
  SlsInstanceSrcLocal,
  SlsInstanceSrcCos,
  ResultInstance,
  RunAction,
  ReportStatus,
  SlsInstanceBaseInfo,
} from './types/index.js'
import { ApiService, type ListInstancesParams } from './api.service.js'

import path from 'node:path'
import fs from 'node:fs/promises'
import yaml from 'js-yaml'
import traverse from 'traverse'
import Graph from 'graph-data-structure'
import fg from 'fast-glob'
import JSZip from 'jszip'
import axios from 'axios'
import { reportStatus } from './decorators.js'
import { isFile, md5sum, getFileStatMap, sleep, filesize } from './util.js'
import { RUN_STATUS } from './constants.js'

export interface RunOptions {
  force: boolean
  maxDeploySize: number
  pollTimeout: number
  pollInterval: number
  followSymbolicLinks: boolean
  reportStatus: (d: ReportStatus) => void
  targets: string[]
}

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
    pollTimeout: 300 * 1000, // 300s
    pollInterval: 200, // 200ms
    followSymbolicLinks: false,
    reportStatus: () => {
      // empty
    },
    targets: [],
  }

  private slsPath: string
  private apiService: ApiService
  private supportFilenames = [
    'serverless.yml',
    'serverless.yaml',
    'serverless.json',
    'serverless.js',
  ]

  constructor(params: SlsConfig) {
    this.slsPath = params.slsPath
    this.apiService = new ApiService(params)
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
    const instance = await this.resolveFile(this.slsPath)
    if (instance && this.isValid(instance)) {
      const resolvedInstance = this.resolveVariables(instance)
      return [resolvedInstance]
    }

    let dirs = await fs.readdir(this.slsPath)
    if (options.targets.length > 0) {
      dirs = dirs.filter((dir) => options.targets.includes(dir))
    }
    let instances = []
    let baseInfo: SlsInstanceBaseInfo | null = null
    for (const dir of dirs) {
      const instancePath = path.resolve(this.slsPath, dir)
      const instance = await this.resolveFile(instancePath)
      if (instance && !this.isValid(instance)) {
        throw new Error(`${dir} is not a valid serverless instance`)
      }
      if (instance) {
        const resolvedInstance = this.resolveVariables(instance)
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

  resolveVariables(instance: SlsInstance) {
    const envRegex = /\$\{env:([\w:\s.-]+)\}/g
    const outputRegex = /\$\{output:([\w:\s.-]+)\}/g
    traverse(instance).forEach(function (value) {
      let updateValue = value
      if (typeof value !== 'string') return
      updateValue.match(envRegex)?.forEach((v: string) => {
        envRegex.lastIndex = 0
        let [, valName] = envRegex.exec(v) ?? []
        valName = valName.trim()
        let resolvedValue = v
        const envName = valName.split(':')[1] ?? ''
        resolvedValue = process.env[envName] ?? value
        updateValue = updateValue.replace(`$\{${valName}}`, resolvedValue)
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

  topologicalSort(instances: SlsInstance[], action: RunAction) {
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

  async updateSrcFiles(instance: SlsInstance, options: RunOptions) {
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
    const { zipBuffer, totalBytes, hasChanges } = await this.zipSrcLocalChanges(
      instance,
      previousMap,
      options,
    )
    if (options.maxDeploySize && totalBytes > options.maxDeploySize) {
      throw new Error(
        `src files size exceed ${filesize(options.maxDeploySize)} can't deploy`,
      )
    }

    await axios.put(changesUploadUrl, zipBuffer)

    return { srcDownloadUrl, totalBytes, cacheOutdated: hasChanges }
  }

  getNormalSrc(instance: SlsInstance) {
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

  @reportStatus(RUN_STATUS.compress)
  async zipSrcLocalChanges(
    instance: SlsInstance,
    previousMap: Record<string, string>,
    options: RunOptions,
  ) {
    if (!instance.$src) {
      throw new Error('src config not exists')
    }
    const srcLocal = instance.$src.src
    const fileStatMap = await this.getSrcLocalFileStatMap(instance, options)

    if (!fileStatMap || !srcLocal) {
      throw new Error('src files to zip is empty')
    }

    const mapSrc: Record<string, string> = {}
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
      mapSrc[filename] = fileHash
    }

    const filesToDelete = Object.keys(previousMap).filter(
      (filename) => !mapSrc[filename],
    )

    zip.file('src.map', Buffer.from(JSON.stringify(mapSrc)))
    zip.file('deleted.files', Buffer.from(JSON.stringify(filesToDelete)))

    const hasChanges = zipFiles.length > 0 || filesToDelete.length > 0

    const zipBuffer = await zip.generateAsync({
      platform: 'UNIX',
      type: 'nodebuffer',
    })

    return {
      mapSrc,
      totalBytes,
      zipBuffer,
      zipFiles,
      hasChanges,
    }
  }

  @reportStatus(RUN_STATUS.readSrc)
  async getSrcLocalFileStatMap(instance: SlsInstance, options: RunOptions) {
    const normalSrc = instance.$src
    if (!normalSrc || !normalSrc.src) return []

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

  async processDeploySrc(instance: SlsInstance, options: RunOptions) {
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
        await this.updateSrcFiles(instance, options)
      cacheOutdated = innerCacheOutdated
      instance.inputs.src = srcDownloadUrl
    } else if (normalSrcOriginal.srcOriginal) {
      instance.inputs.srcOriginal = normalSrcOriginal.srcOriginal
      cacheOutdated = true
    }
    return { instance, cacheOutdated }
  }

  @reportStatus(RUN_STATUS.poll)
  async pollRunResult(
    instance: SlsInstance,
    options: RunOptions,
  ): Promise<ResultInstance | null> {
    const { pollInterval, pollTimeout } = options

    const startTime = Date.now()
    do {
      const { Response } = await this.apiService.getInstance(instance)
      const { instanceStatus } = Response.instance
      if (instanceStatus === 'deploying') {
        await sleep(pollInterval)
      } else {
        return Response.instance
      }
    } while (Date.now() - startTime < pollTimeout)
    return null
  }

  getRunOptions(options: Partial<RunOptions>) {
    const runOptions = Object.assign(
      {},
      this.defaultRunOptions,
      options,
    ) as RunOptions
    return runOptions
  }

  @reportStatus(RUN_STATUS.run)
  async run(action: RunAction, instance: SlsInstance, options: RunOptions) {
    let runInstance = instance
    let cacheOutdated = false
    if (action === 'deploy') {
      ;({ instance: runInstance, cacheOutdated } = await this.processDeploySrc(
        instance,
        options,
      ))
    }
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
    const pollResult = await this.pollRunResult(instance, options)
    return pollResult
  }

  async runAll(action: RunAction, options: Partial<RunOptions> = {}) {
    const runOptions = this.getRunOptions(options)
    const resolvedInstances = await this.resolve(action, runOptions)
    if (!resolvedInstances?.length) {
      throw new Error(`there is no serverless instance to ${action}`)
    }

    const results: Array<ResultInstance | null> = []
    for (const instance of resolvedInstances) {
      results.push(await this.run(action, instance, runOptions))
    }
    return results
  }

  async infoAll(options: Partial<RunOptions> = {}) {
    const runOptions = this.getRunOptions(options)
    const resolvedInstances = await this.resolve('deploy', runOptions)
    if (!resolvedInstances.length) {
      throw new Error('there is no serverless instance to show')
    }

    const infoPromises = resolvedInstances.map((instance) =>
      this.apiService.getInstance(instance).catch((err) => err),
    )
    const resultList = await Promise.all(infoPromises)
    const infoList = resultList.map(
      (result) => result.Response.instance,
    ) as ResultInstance[]

    return infoList
  }

  async list(params: ListInstancesParams = {}) {
    const result = await this.apiService.listInstances(params)
    return result.Response.instances
  }
}
