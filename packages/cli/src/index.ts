#!/usr/bin/env node
/**
 * inventor 命令行入口
 * @author: sunkeysun
 */
import type { plugin as pluginType } from '@inventorjs/cli-core'
import { createRequire } from 'node:module'
import path from 'node:path'
import { readdir } from 'node:fs/promises'
import { Command } from 'commander'
import { plugin, log } from '@inventorjs/cli-core'

const { Plugin: PluginBase, Action: ActionBase } = plugin

const require = createRequire(import.meta.url)

const internalPlugins = ['@inventorjs/cli-plugin-plugin']

async function loadActions(packageName: string) {
  const entry = require.resolve(packageName)
  const pluginRoot = path.dirname(entry)
  const actionDir = path.resolve(path.dirname(entry), 'actions')
  const actionFiles = (await readdir(actionDir)).filter((file) =>
    file.endsWith('.js')
  )
  const actions: { name: string; action: pluginType.Action }[] = []

  for (const actionFile of actionFiles) {
    const actionPath = path.resolve(actionDir, actionFile)
    const { default: Action } = await import(actionPath)
    const action = new Action({ pluginRoot })
    if (!(action instanceof ActionBase)) {
      throw new Error('action must extends from Action base class!')
    }
    const name = path.basename(actionFile, path.extname(actionFile))

    actions.push({ name, action })
  }
  return actions
}

async function registerPlugin(
  cli: Command,
  pluginName: string,
  packageName: string
) {
  const { default: Plugin } = (await import(packageName)) as {
    default: new () => pluginType.Plugin
  }
  const plugin = new Plugin()
  if (!(plugin instanceof PluginBase)) {
    throw new Error('plugin must extends from Plugin base class!')
  }

  const actions = await loadActions(packageName)

  const cmd = cli.command(pluginName)
  cmd.description(plugin.description)

  for (const { name, action } of actions) {
    const actionCmd = cmd.command(name).description(action.description)
    if (action.options) {
      action.options.forEach((option: plugin.ActionOption) =>
        actionCmd.option(option.option, option.description)
      )
    }
    actionCmd.action(
      async (options: Record<string, unknown>) => await action.action(options)
    )
  }
}

async function run() {
  const packageJson = require('../package.json')
  const cli = new Command('inventor').version(packageJson.version)

  log.welcome({ cliName: 'inventor', version: packageJson.version })

  for (const packageName of internalPlugins) {
    await registerPlugin(cli, packageName, packageName)
  }

  cli.parse(process.argv)
}

await run()
