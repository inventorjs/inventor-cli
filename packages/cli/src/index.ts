#!/usr/bin/env node
/**
 * inventor 命令行入口
 * @author: sunkeysun
 */
import { createRequire } from 'node:module'
import path from 'node:path'
import { readdir } from 'node:fs/promises'
import {
  type ActionOption,
  Plugin as CorePlugin,
  Action as CoreAction,
  log,
  rc,
  env,
  pm,
  cmd,
  util,
} from '@inventorjs/cli-core'

type PluginConfigItem = [string, unknown?] | string
type PluginItem = { packageName: string; pluginName: string }

const { Command } = cmd

const BIN = 'inventor'
const DEFAULT_ACTION = 'index'

const require = createRequire(import.meta.url)

const packageJson = require('../package.json')
const cli = new Command(BIN)
  .version(packageJson.version)
  .usage('[command] [action]')
  .addHelpCommand(false)
  .showHelpAfterError(true)

const corePlugins: PluginConfigItem[] = [
  '@inventorjs/inventor-plugin-plugin',
  '@inventorjs/inventor-plugin-app',
]

function isCorePlugin(packageName: string) {
  return corePlugins.find((pkgName) => packageName === pkgName)
}

async function loadActions(plugin: CorePlugin) {
  const actionFiles = (await readdir(plugin.actionPath)).filter((file) =>
    file.endsWith('.js'),
  )
  const actions: { name: string; action: CoreAction }[] = []

  const packageName = await plugin.getPackageName()
  for (const actionFile of actionFiles) {
    try {
      const actionPath = path.resolve(plugin.actionPath, actionFile)
      const { default: Action } = await import(actionPath)
      const action = new Action({
        entryPath: plugin.entryPath,
        plugin,
      }) as CoreAction
      if (!action.__Action__) {
        throw new Error('Action must extends from core Action class!')
      }
      const name = path.basename(actionFile, path.extname(actionFile))

      actions.push({ name, action })
    } catch (err) {
      log.error(
        `plugin[${packageName}] action[${path.basename(
          actionFile,
        )}] load error[skipped]: ${(err as Error).message}`,
      )
    }
  }

  return actions
}

async function registerPlugin({ packageName, pluginName }: PluginItem) {
  let Plugin
  const pmRoot = await pm.root()
  const fullPackageName = isCorePlugin(packageName)
    ? packageName
    : path.resolve(pmRoot, packageName)
  try {
    ;({ default: Plugin } = await import(require.resolve(fullPackageName)))
  } catch (err) {
    log.error(
      `[${
        (err as { code: string }).code
      }]Plugin package "${packageName}" load error!`,
    )
    return
  }
  const entryPath = require.resolve(fullPackageName)
  const plugin = new Plugin({ entryPath }) as CorePlugin
  if (!plugin.__Plugin__) {
    throw new Error('Plugin must extends from core Plugin class!')
  }

  const actions = await loadActions(plugin)
  if (!pluginName) {
    throw new Error(`Plugin[${fullPackageName}] not a valid plugin!`)
  }

  const cmd = cli.command(pluginName)
  cmd.description(
    isCorePlugin(packageName)
      ? `[[${plugin.description}]]`
      : plugin.description,
  )

  for (const { name, action } of actions) {
    const actionCmd = cmd
      .command(name, { isDefault: name === DEFAULT_ACTION })
      .description(action.description)

    if (action.arguments?.length > 0) {
      action.arguments.forEach((argument: ActionOption) =>
        actionCmd.argument(
          argument.flags,
          argument.description,
          argument.defaultValue,
        ),
      )
    }

    if (action.options?.length > 0) {
      action.options.forEach((option: ActionOption) =>
        actionCmd.option(option.flags, option.description, option.defaultValue),
      )
    }

    let actionCallback = async (options: Record<string, unknown>) =>
      await action.action(options, cli.args.slice(2))

    if (action.arguments?.length > 0) {
      actionCallback = async (...args: unknown[]) => {
        const restArgs = args.slice(0, action.arguments.length) as string[]
        const options = args[args.length - 2] as Record<string, unknown>
        await action.action(options, restArgs)
      }
    }
    actionCmd.action(actionCallback)
  }
}

async function searchPlugins() {
  const envContext = env.context()
  const config = await rc.load(envContext)

  let pluginList = corePlugins
  if (config) {
    const { plugins } = config as { plugins: PluginConfigItem[] }
    pluginList = pluginList.concat(plugins)
  }
  const result = pluginList.reduce((result: PluginItem[], plugin) => {
    const packageName = typeof plugin === 'string' ? plugin : plugin[0]
    if (!result.find((plugin) => plugin.packageName === packageName)) {
      const pluginName = util.getPluginName(packageName)
      return [...result, { packageName, pluginName }]
    }
    return result
  }, [])
  return result
}

function welcome({ cliName }: { cliName: string }) {
  log.raw(cliName, { art: { font: 'Speed', color: 'cyan' } })
}

async function run() {
  const [, , pluginName] = process.argv

  if (env.isTTY()) {
    welcome({ cliName: BIN })
  }

  try {
    await pm.checkVersion()
  } catch (err) {
    log.error(err)
    return
  }

  let plugins = await searchPlugins()

  if (pluginName) {
    plugins = plugins.filter((plugin) => plugin.pluginName === pluginName)
  }

  for (const plugin of plugins) {
    await registerPlugin(plugin)
  }

  cli.parse(process.argv)
}

process.on('uncaughtException', (err) => {
  err && log.error(`uncaughtException: ${err}\n${err?.stack ?? ''}`)
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  reason && log.error(reason)
  process.exit(1)
})

await run()
