/**
 * instance processer
 */
import type {
  SlsInstance,
  SlsInstanceSrcLocal,
  SlsInstanceSrcCos,
  ResultInstance,
  SlsAction,
  SlsInstanceBaseInfo,
} from './types/index.js'
import type { ApiService } from './api.service.js'

import path from 'node:path'
import fs from 'node:fs/promises'
import yaml from 'js-yaml'
import traverse from 'traverse'
import Graph from 'graph-data-structure'
import { globby } from 'globby'
import JSZip from 'jszip'
import axios from 'axios'
import { filesize } from 'filesize'
import { isFile, md5sum, getFileStatMap, sleep } from './util.js'

export interface Options {
  force?: boolean
  maxDeploySize?: number
}

export class InstanceService {
  constructor(
    private readonly apiService: ApiService,
    private readonly slsPath: string,
    private readonly options: Options = {
      force: false,
      maxDeploySize: 500 * 1024 * 1024,
    },
  ) {}

  private supportFilenames = [
    'serverless.yml',
    'serverless.yaml',
    'serverless.json',
    'serverless.js',
  ]

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

  async resolve(action: SlsAction, targets: string[] = []) {
    const instance = await this.resolveFile(this.slsPath)
    if (instance && this.isValid(instance)) {
      const resolvedInstance = this.resolveVariables(instance)
      return [resolvedInstance]
    }

    let dirs = await fs.readdir(this.slsPath)
    const instances = []
    let baseInfo: SlsInstanceBaseInfo | null = null
    if (targets.length) {
      dirs = dirs.filter((dir) => targets.includes(dir))
    }
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
    this.topologicalSort(instances, action)
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

  topologicalSort(instances: SlsInstance[], action: SlsAction) {
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

  async uploadSrcFiles(instance: SlsInstance) {
    const { Response } = await this.apiService.getCacheFileUrls(instance)
    const { changesUploadUrl, previousMapDownloadUrl, srcDownloadUrl } =
      Response
    let previousMap: Record<string, string> = {}
    if (!this.options.force) {
      try {
        previousMap = await axios
          .get(previousMapDownloadUrl)
          .then((res) => res.data)
      } catch (err) {
        //
      }
    }
    const { mapSrc, zip, totalBytes, zipFiles } = await this.zipSrcLocalFiles(
      instance,
      previousMap,
    )
    if (this.options.maxDeploySize && totalBytes > this.options.maxDeploySize) {
      throw new Error(
        `src file size exceed ${filesize(this.options.maxDeploySize, {
          base: 2,
        })} can't deploy`,
      )
    }

    const filesToDelete = Object.keys(previousMap).filter(
      (filename) => !mapSrc[filename],
    )

    const cacheOutdated = zipFiles.length > 0 || filesToDelete.length > 0

    zip.file('src.map', Buffer.from(JSON.stringify(mapSrc)))
    zip.file('deleted.files', Buffer.from(JSON.stringify(filesToDelete)))

    const buffer = await zip.generateAsync({
      platform: 'UNIX',
      type: 'nodebuffer',
    })

    await axios.put(changesUploadUrl, buffer)

    return { srcDownloadUrl, totalBytes, cacheOutdated }
  }

  getNormalSrc(instance: SlsInstance) {
    const src = instance.inputs.src
    if (!src) {
      return { src: null }
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

  async zipSrcLocalFiles(
    instance: SlsInstance,
    previousMap: Record<string, string>,
    mode: 'code' | 'serverless' = 'serverless',
  ) {
    const srcLocal = instance.$src.src
    const srcLocalFiles = await this.getSrcLocalFiles(instance)
    if (!srcLocal || !srcLocalFiles.length) {
      throw new Error('src files to zip is empty')
    }
    const fileStatMap = await getFileStatMap(srcLocalFiles)
    const mapSrc: Record<string, string> = {}
    const zip = new JSZip()
    let totalBytes = 0
    const zipFiles = []
    for (const file of srcLocalFiles) {
      const { content, stat } = fileStatMap[file]
      const filename = path.relative(srcLocal, file)
      if (mode === 'code') {
        zip.file(filename, content, {
          unixPermissions: stat.mode,
        })
        zipFiles.push(filename)
      } else {
        const fileHash = md5sum(content)
        if (!previousMap[filename] || previousMap[filename] !== fileHash) {
          zip.file(filename, content, {
            unixPermissions: stat.mode,
          })
          zipFiles.push(filename)
        }
        totalBytes += stat.size
        mapSrc[filename] = fileHash
      }
    }

    return {
      mapSrc,
      totalBytes,
      zip,
      zipBuffer:
        mode === 'code' ? zip.generateAsync({ platform: 'UNIX' }) : null,
      zipFiles,
    }
  }

  async getSrcLocalFiles(instance: SlsInstance) {
    const normalSrc = instance.$src
    if (!normalSrc || !normalSrc.src) return []

    const srcPath = normalSrc.src
    const exclude = normalSrc?.exclude ?? []
    const files = await globby(`${srcPath}/**/(.)?*`, {
      ignore: exclude,
    })
    const include = normalSrc?.include ?? []
    include.forEach((file) => {
      files.push(path.resolve(srcPath, file))
    })
    return files
  }

  async processDeploySrc(instance: SlsInstance) {
    const normalSrc = instance.$src
    const normalSrcOriginal = instance.$src as {
      srcOriginal: SlsInstanceSrcCos
    }
    let cacheOutdated = false
    if (normalSrc.src) {
      const { srcDownloadUrl, cacheOutdated: innerCacheOutdated } =
        await this.uploadSrcFiles(instance)
      cacheOutdated = innerCacheOutdated
      instance.inputs.src = srcDownloadUrl
    } else if (normalSrcOriginal.srcOriginal) {
      instance.inputs.srcOriginal = normalSrcOriginal
      cacheOutdated = true
    }
    return { instance, cacheOutdated }
  }

  private async pollRunResult(
    instance: SlsInstance,
  ): Promise<ResultInstance | null> {
    // const { pollInterval, pollTimeout } = this.options
    const pollInterval = 200
    const pollTimeout = 30 * 1000
    const startTime = Date.now()
    do {
      const { Response } = await this.apiService.getInstance({ instance })
      const { instanceStatus } = Response.instance
      if (instanceStatus === 'deploying') {
        await sleep(pollInterval)
      } else {
        return Response.instance
      }
    } while (Date.now() - startTime < pollTimeout)
    return null
  }

  async run(action: SlsAction) {
    const resolvedInstances = await this.resolve(action)
    if (!resolvedInstances.length) {
      throw new Error(`there is no serverless instance to ${action}`)
    }
    for (const instance of resolvedInstances) {
      const { instance: deployInstance, cacheOutdated } =
        await this.processDeploySrc(instance)
      console.log(deployInstance, cacheOutdated, '111')
      await this.apiService.runComponent({
        instance: deployInstance,
        method: action,
        options: {
          cacheOutdated,
        },
      })
      const result = await this.pollRunResult(instance)
      return result
    }
  }
}
