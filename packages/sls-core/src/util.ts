/**
 * util
 */
import type { SlsAction, SlsInstance } from './types.js'

import path from 'node:path'
import fs from 'node:fs/promises'
import yaml from 'js-yaml'
import traverse from 'traverse'
import Graph from 'graph-data-structure'

export async function isFile(filePath: string) {
  try {
    return (await fs.stat(filePath)).isFile()
  } catch (err) {
    return false
  }
}

export function isObject(data: unknown) {
  return data && typeof data === 'object'
}

export async function resolveSlsFile(slsPath: string) {
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

export function isValidInstance(instance?: Record<string, unknown>) {
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

export async function resolveSlsInstances(slsPath: string, action: SlsAction) {
  const instance = await resolveSlsFile(slsPath)
  if (instance && instance.component) {
    return [instance]
  }
  const dirs = await fs.readdir(slsPath)
  const instances = []
  let commonConfig: Pick<SlsInstance, 'org' | 'app' | 'stage'> | null = null
  for (const dir of dirs) {
    const instance = await resolveSlsFile(path.resolve(slsPath, dir))
    if (instance && !isValidInstance(instance)) {
      throw new Error(`${dir} is not a valid serverless instance`)
    }
    if (instance) {
      let resolvedInstance = resolveSlsInstanceVariables(instance)
      resolvedInstance = resolveSlsInstanceSrc(instance, slsPath)
      const { org, app, stage } = resolvedInstance
      if (!commonConfig) {
        commonConfig = { org, app, stage }
      }
      const { org: cOrg, app: cApp, stage: cStage } = commonConfig
      if (cOrg !== org || cApp !== app || cStage !== stage) {
        throw new Error(`serverless instance's "org" "app" "stage" must equal`)
      }
      instances.push(resolvedInstance)
    }
  }
  sortSlsInstances(instances, action)
  return instances
}

export function resolveSlsInstanceVariables(instance: SlsInstance) {
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

export function resolveSlsInstanceSrc(instance: SlsInstance, slsPath: string) {
  if (typeof instance.inputs.src === 'string') {
    instance.inputs.src = path.resolve(
      `${slsPath}/serverless.yml`,
      instance.inputs.src,
    )
  } else if (typeof instance.inputs?.src?.src === 'string') {
    instance.inputs.src.src = path.resolve(
      `${slsPath}/serverless.yml`,
      instance.inputs.src.src,
    )
    if (instance.inputs?.src?.excludes?.length) {
      const { excludes } = instance.inputs?.src ?? {}
      if (excludes && excludes.length) {
        instance.inputs.src.excludes = excludes.map((exclude: string) =>
          path.resolve(instance.inputs.src.src, exclude),
        )
      }
    }
  }
  return instance
}

export function sortSlsInstances(instances: SlsInstance[], action: SlsAction) {
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

export function getStageRegion(stage = 'prod') {
  return stage === 'dev' ? 'ap-shanghai' : 'ap-guangzhou'
}
