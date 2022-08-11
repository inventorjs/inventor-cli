/**
 * 插件基础类
 * @author: sunkeysun
 */
import { Command } from 'commander'
import * as util from './util.js'

const internalPlugins = [
  'plugin',
]

interface PluginDefination {
  name: string
  description: string
  actions: {
    name: string
    description: string
    options?: {
      option: string
      description: string
      default?: unknown
    }[]
  }[]
}

type ActionFun = (options: Record<string, unknown>) => Promise<void>

export abstract class Plugin {
  abstract define(): Promise<PluginDefination>

  async checkIsExists(name: string) {
    const vendorPlugins = ['eslint']
    if (vendorPlugins.concat(internalPlugins).includes(name)) {
      return true
    }
    return false
  }

  async checkIsValid(name: string) {
    if (!/^\w+$/.test(name)) {
      return false
    }
    return true
  }
}

async function registerCmd(cli: Command, Plugin: new () => Plugin) {
  const plugin = new Plugin()
  const pluginDefination = await plugin.define()
  const pluginName = pluginDefination.name

  const cmd = cli.command(pluginName)
  cmd.description(pluginDefination.description)

  for (const actionConfig of pluginDefination.actions) {
    const action = cmd.command(actionConfig.name)
                      .description(actionConfig.description)
    if (actionConfig.options) {
      actionConfig.options.forEach((option) => action.option(option.option, option.description))
    }
    const actionName = await util.capitalize(actionConfig.name)
    const actionFunName = `action${actionName}` as keyof Plugin
    if (!plugin[actionFunName]) {
      throw new Error(`actionFun "${actionFunName}" not exists!`)
    }
    action.action(
      async (options) => await (plugin[actionFunName] as unknown as ActionFun)(options)
    )
  }
}

export async function init(cli: Command) {
  for (const pluginName of internalPlugins) {
    const { default: Plugin } = await import(`../plugins/${pluginName}`)
    await registerCmd(cli, Plugin)
  }
}
