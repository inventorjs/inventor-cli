/**
 * template service
 */
import type {
  SlsInstance,
  RunAction,
  RunOptions,
  SlsInstanceBaseInfo,
  OriginInstance,
  MultiInstance,
  SlsConfig,
  SlsInstanceSrcLocal,
  SlsInstanceSrcCos,
  SlsTemplate,
} from '../types/index.js'
import path from 'node:path'
import fs from 'node:fs/promises'
import yaml from 'js-yaml'
import traverse from 'traverse'
import Graph from 'graph-data-structure'
import { reportStatus } from '../decorators.js'
import { isFile, isObject } from '../util.js'
import { RUN_STATUS } from '../constants.js'
import { CircularError } from '../errors.js'

export class TemplateService {
  private supportFilenames = [
    'serverless.yml',
    'serverless.yaml',
    'serverless.json',
    'serverless.js',
  ]

  constructor(private readonly config: SlsConfig) {}

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
        ;({ default: instance } = await import(filePath))
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
    return { ...multiInstance, instances }
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
  async resolve(action: RunAction, options: RunOptions): Promise<SlsTemplate> {
    const ins = await this.resolveFile(this.config.slsPath)
    const multiInstance = ins as MultiInstance
    const instance = ins as SlsInstance
    let instances: SlsInstance[] = []

    let hooks: Record<string, string> | undefined
    let rest
    if (this.isMultiInstance(multiInstance)) {
      ;({ instances, hooks, ...rest } = this.resolveMultiInstance(
        multiInstance,
        options,
      ))
    } else if (this.isInstance(instance)) {
      instances = this.resolveSingleInstance(instance, options)
    } else {
      instances = await this.resolveDirInstance(options)
    }

    if (instances.length > 0) {
      instances = this.topologicalSort(instances, action)
    }
    if (options.deployType === 'code') {
      instances = instances.filter((instance) => instance.$src?.src)
    }
    const { org, app, stage, name } = instances[0]
    return { org, app, stage, instances, hooks }
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
}
