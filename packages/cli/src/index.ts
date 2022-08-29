#!/usr/bin/env node
/**
 * inventor 命令行入口
 * @author: sunkeysun
 */
import { createRequire } from 'node:module'
import path from 'node:path'
import { readdir } from 'node:fs/promises'
import { Command } from 'commander'
import { Plugin, Action, log, type ActionOption } from '@inventorjs/cli-core'

const BIN = 'inventor'
const DEFAULT_ACTION = 'index'

const require = createRequire(import.meta.url)

const corePlugins = [
  { pluginName: 'plugin', packageName: '@inventorjs/cli-plugin-plugin' },
]

async function loadActions(plugin: Plugin) {
  const actionFiles = (await readdir(plugin.actionPath)).filter((file) =>
    file.endsWith('.js'),
  )
  const actions: { name: string; action: Action }[] = []

  for (const actionFile of actionFiles) {
    try {
      const actionPath = path.resolve(plugin.actionPath, actionFile)
      const { default: SubAction } = await import(actionPath)
      const action = new SubAction({
        entryPath: plugin.entryPath,
      }) as Action
      if (!(action instanceof Action)) {
        throw new Error('SubAction must extends from Action base class!')
      }
      const name = path.basename(actionFile, path.extname(actionFile))

      actions.push({ name, action })
    } catch (err) {
      console.log(
        `${path.basename(actionFile)} load error[skipped]: ${
          (err as Error).message
        }`,
      )
    }
  }

  return actions
}

async function registerPlugin(
  cli: Command,
  pluginName: string,
  packageName: string,
) {
  const { default: SubPlugin } = await import(packageName)
  const entryPath = require.resolve(packageName)
  const plugin = new SubPlugin({ entryPath }) as Plugin
  if (!(plugin instanceof Plugin)) {
    throw new Error('SubPlugin must extends from Plugin base class!')
  }

  const actions = await loadActions(plugin)

  const cmd = cli.command(pluginName)
  cmd.description(plugin.description)

  for (const { name, action } of actions) {
    const actionCmd = cmd
      .command(name, { isDefault: name === DEFAULT_ACTION })
      .description(action.description)
    if (action.options) {
      action.options.forEach((option: ActionOption) =>
        actionCmd.option(option.option, option.description),
      )
    }
    actionCmd.action(
      async (options: Record<string, unknown>) => await action.action(options),
    )
  }
}

async function run() {
  const packageJson = require('../package.json')
  const cli = new Command(BIN).version(packageJson.version)

  log.welcome({ cliName: BIN, version: packageJson.version })

  for (const { pluginName, packageName } of corePlugins) {
    await registerPlugin(cli, pluginName, packageName)
  }

  cli.parse(process.argv)
}

process.on('uncaughtException', () => {
  log.error('uncaughtException')
})

process.on('unhandledRejection', (reason) => {
  log.error(reason as string)
})

await run()
