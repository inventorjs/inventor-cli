/**
 * instance processer
 */
import type {
  Instance,
  InstanceSrcEx,
  Action,
  InstanceSrcCos,
} from './types/index.js'

import path from 'node:path'
import fs from 'node:fs/promises'
import yaml from 'js-yaml'
import traverse from 'traverse'
import Graph from 'graph-data-structure'
import { globby } from 'globby'
import JSZip from 'jszip'
import axios from 'axios'
import pLimit from 'p-limit'
import { isFile, md5sum } from './util.js'
import { Stats } from 'node:fs'

export class SlsInstance {
  async resolveSlsFile(slsPath: string) {
    const supportFileNames = [
      'serverless.yml',
      'serverless.yaml',
      'serverless.json',
      'serverless.js',
    ]
    for (const filename of supportFileNames) {
      const filePath = path.join(slsPath, filename)
      if (await isFile(filePath)) {
        const content = await fs.readFile(filePath, 'utf8')
        if (filename.endsWith('yml') || filename.endsWith('yaml')) {
          try {
            return yaml.load(content)
          } catch (err) {
            return null
          }
        } else if (filename.endsWith('json')) {
          try {
            return JSON.parse(content)
          } catch (err) {
            return null
          }
        } else {
          const { default: result } = await import(filePath)
          return result
        }
      }
    }
    return null
  }

  isValidInstance(instance?: Record<string, unknown>) {
    if (
      !instance ||
      !instance.app ||
      !instance.stage ||
      !instance.name ||
      !instance.component
    ) {
      return false
    }
    return true
  }

  async resolveSlsInstances(slsPath: string, action: Action) {
    const instance = await this.resolveSlsFile(slsPath)
    if (instance && instance.component) {
      return [instance]
    }
    const dirs = await fs.readdir(slsPath)
    const instances = []
    let commonConfig: Pick<Instance, 'org' | 'app' | 'stage'> | null = null
    for (const dir of dirs) {
      const instance = await this.resolveSlsFile(path.resolve(slsPath, dir))
      if (instance && !this.isValidInstance(instance)) {
        throw new Error(`${dir} is not a valid serverless instance`)
      }
      if (instance) {
        let resolvedInstance = this.resolveSlsInstanceVariables(instance)
        resolvedInstance = this.resolveSlsInstanceSrc(instance, slsPath)
        const { org, app, stage } = resolvedInstance
        if (!commonConfig) {
          commonConfig = { org, app, stage }
        }
        const { org: cOrg, app: cApp, stage: cStage } = commonConfig
        if (cOrg !== org || cApp !== app || cStage !== stage) {
          throw new Error(
            `serverless instance's "org" "app" "stage" must equal`,
          )
        }
        instances.push(resolvedInstance)
      }
    }
    this.sortSlsInstances(instances, action)
    return instances
  }

  resolveSlsInstanceVariables(instance: Instance) {
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

  resolveSlsInstanceSrc(instance: Instance, slsPath: string) {
    const srcEx = instance.inputs.src as InstanceSrcEx
    if (typeof instance.inputs.src === 'string') {
      instance.inputs.srcOriginal = instance.inputs.src
      instance.inputs.src = path.resolve(
        `${slsPath}/serverless.yml`,
        instance.inputs.src,
      )
    } else if (typeof srcEx?.src === 'string') {
      instance.inputs.srcOriginal = srcEx
      srcEx.src = path.resolve(`${slsPath}/serverless.yml`, srcEx.src)
    }
    return instance
  }

  sortSlsInstances(instances: Instance[], action: Action) {
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
    const sortedInstances: Instance[] = []
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

  async getFileStatMap(files: string[]) {
    const limit = pLimit(4096)
    const tasks = files.map((filePath) =>
      limit(() => Promise.all([fs.readFile(filePath), fs.lstat(filePath)])),
    )
    const resultList = await Promise.all(tasks)
    const resultMap = resultList.reduce<
      Record<string, { content: Buffer; stat: Stats }>
    >(
      (result, [content, stat], index) => ({
        ...result,
        [files[index]]: { content, stat },
      }),
      {},
    )
    return resultMap
  }

  async processDeployInstance(instance: Instance, action: Action) {
    if (action !== 'deploy') return instance
    const src = instance.inputs.src
    if (!src) return instance
    const srcEx = src as InstanceSrcEx
    const srcCos = src as InstanceSrcCos
    if (typeof src === 'string' || typeof srcEx?.src === 'string') {
      // from local files
      const zip = new JSZip()
      let realSrc = src as string
      const exclude = srcEx?.exclude ?? []
      if (typeof srcEx?.src === 'string') {
        realSrc = srcEx.src
      }
      const files = await globby('**/(.)?*', {
        ignore: exclude,
        cwd: realSrc,
      })
      const include = srcEx?.include ?? []
      include.forEach((file) => {
        files.push(path.relative(realSrc, file))
      })

      const { Response } = await this.apiService.getCacheFileUrls(instance)
      const { changesUploadUrl, previousMapDownloadUrl, srcDownloadUrl } =
        Response
      let previousMap: Record<string, string> = {}
      try {
        previousMap = await axios
          .get(previousMapDownloadUrl)
          .then((res) => res.data)
      } catch (err) {
        //
      }
      const fileStatMap = await this.getFileStatMap(files)

      const mapObj: Record<string, string> = {}
      const filesToDelete: string[] = []

      for (const file of Object.keys(fileStatMap)) {
        const { content, stat } = fileStatMap[file]
        const fileHash = md5sum(content)
        const filename = path.relative(realSrc, file)
        if (!previousMap[filename] || previousMap[filename] !== fileHash) {
          zip.file(filename, content, {
            unixPermissions: stat.mode,
          })
        }
        mapObj[filename] = fileHash
      }

      Object.keys(previousMap).forEach((filename) => {
        if (!mapObj[filename]) {
          filesToDelete.push(filename)
          delete mapObj[filename]
        }
      })

      zip.file('src.map', Buffer.from(JSON.stringify(mapObj)))
      zip.file('deleted.files', Buffer.from(JSON.stringify(filesToDelete)))

      const buffer = await zip.generateAsync({
        platform: 'UNIX',
        type: 'nodebuffer',
      })

      await axios.put(changesUploadUrl, buffer)
      instance.inputs.src = srcDownloadUrl
      console.log(previousMap)
    } else if (
      typeof srcCos.bucket === 'string' &&
      typeof srcCos.object === 'string'
    ) {
      // from cos object
      instance.inputs.srcOriginal = src
      delete instance.inputs.src
    }
    return instance
  }
}
