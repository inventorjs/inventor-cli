/**
 * 插件基础类
 * @author: sunkeysun
 */
import { createRequire } from 'node:module'
import path from 'node:path'
import { readdir } from 'node:fs/promises'
import { Command } from 'commander'
import * as rc from './rc.js'

type PluginType = new () => Plugin

type PluginConfig = {
  pluginName: string
  packageName: string
  options?: Record<string, unknown>
}[]

type ActionOption = {
  option: string
  description: string
  default?: unknown 
}

const require = createRequire(import.meta.url)

const internalPlugins = [
  'plugin',
]

function getInternalPluginPackageName(pluginName: string) {
  return `../plugins/${pluginName}/index.ts`
}

async function loadActions(packageName: string) {
  const entry = require.resolve(packageName)
  const actionDir = path.resolve(path.dirname(entry), 'actions')
  const actionFiles = await readdir(actionDir)
  const actions: Action[] = []
  for (const actionFile of actionFiles) {
    const actionPath = path.resolve(actionDir, actionFile)
    const { default: Action } = await import(actionPath)
    const action = new Action()
    if (!(action instanceof Action)) {
      throw new Error('action must extends from Action base class!')
    }
    actions.push(new Action())
  }
  return actions
}

async function registerPlugin(cli: Command, pluginName: string, packageName: string) {
  const { default: Plugin } = await import(packageName) as { default: PluginType }
  const plugin = new Plugin()
  if (!(plugin instanceof Plugin)) {
    throw new Error('plugin must extends from Plugin base class!')
  }
  const actions = await loadActions(packageName)

  const cmd = cli.command(pluginName)
  cmd.description(plugin.description)

  for (const action of actions) {
    const actionCmd = cmd.command(action.name)
                      .description(action.description)
    if (action.options) {
      action.options.forEach((option) => actionCmd.option(option.option, option.description))
    }
    actionCmd.action(action.action)
  }
}

export abstract class Plugin {
  abstract description: string
}

export abstract class Action {
  abstract name: string
  abstract description: string
  abstract options?: ActionOption[]
  abstract action(options: Record<string, unknown>): Promise<void>
}

export async function init(cli: Command) {
  for (const pluginName of internalPlugins) {
    const packageName = getInternalPluginPackageName(pluginName)
    await registerPlugin(cli, pluginName, packageName)
  }

  const globalVendorPlugins  = (await rc.getGlobal('plugins') ?? []) as PluginConfig
  const localVendorPlugins = (await rc.getLocal('plugins') ?? []) as PluginConfig

  for (const plugin of localVendorPlugins.concat(globalVendorPlugins)) {
    await registerPlugin(cli, plugin.pluginName, plugin.packageName)
  }
}
