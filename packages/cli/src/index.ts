#!/usr/bin/env node
/**
 * inventor 命令行入口
 * @author: sunkeysun
 */
import { createRequire } from 'node:module'
import path from 'node:path'
import { readdir } from 'node:fs/promises'
import { Command } from 'commander'
import figlet from 'figlet'
import { Plugin, Action, log, type ActionOption, rc, env } from '@inventorjs/core'

const BIN = 'inventor'
const DEFAULT_ACTION = 'index'

const require = createRequire(import.meta.url)

/**
 * 本地插件 -> 内置插件
 */

const corePlugins = [
  { pluginName: 'plugin', packageName: '@inventorjs/plugin-plugin' },
  { pluginName: 'app', packageName: '@inventorjs/plugin-app' },
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

async function searchPlugins() {
  const envContext = env.context()
  const config = await rc.load(envContext)
  if (!config) return corePlugins

  const { plugins } = config as {plugins: [string, string][]}
  const externalPlugins = plugins.map(([packageName]) => ({
    pluginName: getPluginName(packageName),
    packageName,
  }));
  return [...corePlugins, ...externalPlugins]
}

function welcome({ cliName }: { cliName: string }) {
  log.raw(log.color.cyan(figlet.textSync(cliName, { font: 'Speed' })))
}

function getPluginName(packageName: string) {
  return packageName.replace('@inventorjs/plugin-', '').replace(/(@\w+)?inventor-plugin-/g, '')
}

async function run() {
  const [,, pluginName] = process.argv
  const packageJson = require('../package.json')
  const cli = new Command(BIN).version(packageJson.version)

  welcome({ cliName: BIN })

  let plugins = await searchPlugins()
  if (pluginName) {
    plugins = plugins.filter((plugin) => plugin.pluginName === pluginName)
  }

  for (const { pluginName, packageName } of plugins) {
    await registerPlugin(cli, pluginName, packageName)
  }

  cli.parse(process.argv)
}

process.on('uncaughtException', (err) => {
  log.error(`uncaughtException: ${err}`)
})

process.on('unhandledRejection', (reason) => {
  log.error(reason as string)
})

await run()
