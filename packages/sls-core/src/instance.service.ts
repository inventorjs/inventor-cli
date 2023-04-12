/**
 * instance processer
 */
import type {
  SlsInstance,
  SlsInstanceSrcEx,
  SlsInstanceSrcCos,
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

  async resolve(action: SlsAction) {
    const instance = await this.resolveFile(this.slsPath)
    if (instance && this.isValid(instance)) {
      const resolvedInstance = this.resolveVariables(instance)
      return [resolvedInstance]
    }

    const dirs = await fs.readdir(this.slsPath)
    const instances = []
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

  async uploadSrcChanges(
    instance: SlsInstance,
    files: string[],
    realSrc: string,
  ) {
    const { Response } = await this.apiService.getCacheFileUrls(instance)
    const { changesUploadUrl, previousMapDownloadUrl, srcDownloadUrl } =
      Response
    const fileStatMap = await getFileStatMap(files)

    let totalSize = 0
    Object.values(fileStatMap).forEach(({ stat }) => (totalSize += stat.size))

    if (this.options.maxDeploySize && totalSize > this.options.maxDeploySize) {
      throw new Error(`src can't exceed ${this.options.maxDeploySize}`)
    }

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
    const mapObj: Record<string, string> = {}
    const zip = new JSZip()
    let bytes = 0
    const filesToUpload = []
    for (const file of files) {
      const { content, stat } = fileStatMap[file]
      const fileHash = md5sum(content)
      const filename = path.relative(realSrc, file)
      if (!previousMap[filename] || previousMap[filename] !== fileHash) {
        zip.file(filename, content, {
          unixPermissions: stat.mode,
        })
        filesToUpload.push(filename)
      }
      bytes += stat.size
      mapObj[filename] = fileHash
    }

    const filesToDelete = Object.keys(previousMap).filter(
      (filename) => !mapObj[filename],
    )

    const cacheOutdated = !filesToUpload.length && !filesToDelete.length

    zip.file('src.map', Buffer.from(JSON.stringify(mapObj)))
    zip.file('deleted.files', Buffer.from(JSON.stringify(filesToDelete)))

    const buffer = await zip.generateAsync({
      platform: 'UNIX',
      type: 'nodebuffer',
    })

    await axios.put(changesUploadUrl, buffer)

    return { srcDownloadUrl, bytes, cacheOutdated }
  }

  async processDeploySrc(instance: SlsInstance) {
    let cacheOutdated = false
    const src = instance.inputs.src
    if (!src) return { instance, cacheOutdated }
    const srcEx = src as SlsInstanceSrcEx
    const srcCos = src as SlsInstanceSrcCos
    if (typeof src === 'string' || typeof srcEx?.src === 'string') {
      // src from local files
      let realSrc = src as string
      const exclude = srcEx?.exclude ?? []
      if (typeof srcEx?.src === 'string') {
        realSrc = srcEx.src
      }
      realSrc = path.resolve(instance.$path, realSrc)
      const files = await globby(`${realSrc}/**/(.)?*`, {
        ignore: exclude,
      })
      const include = srcEx?.include ?? []
      include.forEach((file) => {
        files.push(path.resolve(realSrc, file))
      })
      const { srcDownloadUrl, cacheOutdated: innerCacheOutdated } =
        await this.uploadSrcChanges(instance, files, realSrc)

      cacheOutdated = innerCacheOutdated
      instance.inputs.src = srcDownloadUrl
    } else if (
      typeof srcCos.bucket === 'string' &&
      typeof srcCos.object === 'string'
    ) {
      // src from cos object
      cacheOutdated = true
      instance.inputs.srcOriginal = src
      delete instance.inputs.src
    }
    return { instance, cacheOutdated }
  }
}
