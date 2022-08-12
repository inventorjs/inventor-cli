/**
 * 插件基础类
 * @author: sunkeysun
 */
import { createRequire } from 'node:module'
import path from 'node:path'
import { readdir } from 'node:fs/promises'
import { Command } from 'commander'

type PluginType = new () => Plugin

const require = createRequire(import.meta.url)

const internalPlugins = [
  'plugin',
]

async function registerPlugin(cli: Command, packageName: string) {
  const { default: Plugin } = await import(packageName) as { default: PluginType }
  const plugin = new Plugin()
  const actions = await plugin.loadActions(require.resolve(packageName))

  const cmd = cli.command(plugin.name)
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
  abstract name: string
  abstract description: string

  async loadActions(entry: string) {
    const actionDir = path.resolve(path.dirname(entry), 'actions')
    const actionFiles = await readdir(actionDir)
    const actions: Action[] = []
    for (const actionFile of actionFiles) {
      const actionPath = path.resolve(actionDir, actionFile)
      const { default: Action } = await import(actionPath)
      actions.push(new Action())
    }
    return actions
  }
}

export abstract class Action {
  abstract name: string
  abstract description: string
  abstract options?: {
    option: string
    description: string
    default?: unknown
  }[]
  abstract action(options: Record<string, unknown>): Promise<void>
}

export async function init(cli: Command) {
  for (const pluginName of internalPlugins) {
    const packageName = `../plugins/${pluginName}`
    await registerPlugin(cli, packageName)
  }
}
