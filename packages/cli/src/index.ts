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
import {
  type ActionOption,
  Plugin as CorePlugin,
  Action as CoreAction,
  log,
  rc,
  env,
} from '@inventorjs/core'

interface PluginItem {
  packageName: string
  pluginName: string
}

const BIN = 'inventor'
const DEFAULT_ACTION = 'index'

const require = createRequire(import.meta.url)

const corePlugins: [string, unknown?][] = [
  ['@inventorjs/plugin-plugin'],
  ['@inventorjs/plugin-app'],
]

async function loadActions(plugin: CorePlugin) {
  const actionFiles = (await readdir(plugin.actionPath)).filter((file) =>
    file.endsWith('.js'),
  )
  const actions: { name: string; action: CoreAction }[] = []

  for (const actionFile of actionFiles) {
    try {
      const actionPath = path.resolve(plugin.actionPath, actionFile)
      const { default: Action } = await import(actionPath)
      const action = new Action({
        entryPath: plugin.entryPath,
      }) as CoreAction
      if (!action.__Action__) {
        throw new Error('Action must extends from core Action class!')
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
  const { default: Plugin } = await import(packageName)
  const entryPath = require.resolve(packageName)
  const plugin = new Plugin({ entryPath }) as CorePlugin
  if (!plugin.__Plugin__) {
    throw new Error('Plugin must extends from core Plugin class!')
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

  const pluginList = corePlugins
  if (config) {
    const { plugins } = config as { plugins: [string, unknown?][] }
    pluginList.push(...plugins)
  }
  const result = pluginList.reduce((result: PluginItem[], [packageName]) => {
    if (!result.find((plugin) => plugin.packageName === packageName)) {
      return [
        ...result,
        { pluginName: getPluginName(packageName), packageName },
      ]
    }
    return result
  }, [])
  return result
}

function welcome({ cliName }: { cliName: string }) {
  log.raw(cliName, { art: { font: 'Speed', color: 'cyan' } })
}

function getPluginName(packageName: string) {
  return packageName
    .replace('@inventorjs/plugin-', '')
    .replace(/$(@[\w-_]+)?inventor-plugin-/g, '')
}

async function run() {
  const [, , pluginName] = process.argv
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
