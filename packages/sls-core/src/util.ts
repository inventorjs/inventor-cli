/**
 * util
 */
import type { SlsInstance, SlsTemplate } from './types.js'

import path from 'node:path'
import fs from 'node:fs/promises'
import yaml from 'js-yaml'
import traverse from 'traverse'
import { Graph } from '@dagrejs/graphlib'

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

export async function getSlsInstanceList(slsPath: string) {
  const instance = await resolveSlsFile(slsPath)
  if (instance && instance.component) {
    return [instance]
  }
  const dirs = await fs.readdir(slsPath)
  const instanceList = []
  for (const dir of dirs) {
    const instance = await resolveSlsFile(path.resolve(slsPath, dir))
    if (!isValidInstance(instance)) {
      throw new Error(`${dir} is not a valid serverless instance`)
    }
    instanceList.push(instance)
  }
  return instanceList
}

export async function resolveSlsTemplate(slsPath: string) {
  const instanceList = await getSlsInstanceList(slsPath)
  if (!instanceList.length) {
    throw new Error(`no serverless instance found at ${slsPath}`)
  }

  let template: SlsTemplate | null = null
  for (const instance of instanceList) {
    const { org, app, stage } = instance
    if (!template) {
      template = { org, app, stage, instances: [] }
    }
    const { org: tOrg, app: tApp, stage: tStage } = template
    if (tOrg !== org || tApp !== app || tStage !== stage) {
      throw new Error(`serverless instance's "org" "app" "stage" must equal`)
    }
    template.instances.push(instance)
  }
  if (!template) return null
  template = resolveSlsTemplateVariables(template)
  template = sortSlsTemplateInstances(template)
  return template
}

export function resolveInstanceVariables(value: string, instance: SlsInstance) {
  const variableRegex = /\$\{([\w:\s.-]+)\}/g
  const outputRegex = /\$\{output:([\w:\s.-]+)\}/g
  let updateValue = value
  updateValue.match(variableRegex)?.forEach((v) => {
    variableRegex.lastIndex = 0
    let [, valName] = variableRegex.exec(v) ?? []
    valName = valName.trim()
    let resolvedValue = v
    if (valName.startsWith('env:')) {
      const envName = valName.split(':')[1] ?? ''
      resolvedValue = process.env[envName] ?? value
    } else {
      const innerVal = instance[valName as keyof SlsInstance]
      if (innerVal && !isObject(innerVal)) {
        resolvedValue = innerVal as string
      }
    }
    updateValue = updateValue.replace(`$\{${valName}}`, resolvedValue)
  })
  if (outputRegex.exec(updateValue)) {
    const depName = updateValue.split(':').at(-1)?.split('.')[0]
    if (depName && !instance.$deps?.includes?.(depName)) {
      instance.$deps ??= []
      instance.$deps.push(depName)
    }
  }
  return updateValue
}

export function resolveSlsTemplateVariables(template: SlsTemplate) {
  for (const instanceName in template.instances) {
    const instance = template.instances[instanceName]
    traverse(instance.inputs).forEach(function (value) {
      if (typeof value === 'string') {
        const updateValue = resolveInstanceVariables(value, instance)
        if (updateValue !== value) {
          this.update(updateValue)
        }
      }
    })
  }
  return template
}

export function sortSlsTemplateInstances(template: SlsTemplate) {
  const graph = new Graph()
  const { instances } = template

  instances.forEach((instance) => {
    instance?.$deps?.forEach((depInstanceName) => {
      graph.setEdge(instance.name, depInstanceName)
    })
  })

  const sortedInstances: SlsInstance[] = []
  function traverseGraph() {
    const leaves = graph.sinks()
    if (!leaves?.length) {
      return
    }
    leaves.forEach((instanceName) => {
      const instance = instances.find(
        (instance) => instance.name === instanceName,
      )
      if (instance) {
        sortedInstances.push(instance)
      }
      graph.removeNode(instanceName)
    })
    traverseGraph()
  }
  traverseGraph()

  template.instances = sortedInstances
  return template
}

export function getStageRegion(stage = 'prod') {
  return stage === 'dev' ? 'ap-shanghai' : 'ap-guangzhou'
}
