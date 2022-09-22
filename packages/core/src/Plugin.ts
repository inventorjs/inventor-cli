/**
 * Plugin 抽象类
 * @author: sunkeysun
 */
import type { RenderOptions } from './modules/fs.js'
import type { LoadFrom } from './modules/rc.js'
import path from 'node:path'
import inquirer from 'inquirer'
import { oraPromise } from 'ora'
import * as fs from './modules/fs.js'
import * as env from './modules/env.js'
import * as log from './modules/log.js'
import * as git from './modules/git.js'
import * as pm from './modules/pm.js'
import * as cmd from './modules/cmd.js'
import * as rc from './modules/rc.js'

export abstract class Plugin {
  abstract description: string
  #entryPath: string
  #templatePath: string
  #actionPath: string

  constructor({ entryPath }: { entryPath: string }) {
    this.#entryPath = entryPath
    this.#templatePath = path.resolve(entryPath, '../../templates')
    this.#actionPath = path.resolve(entryPath, '../actions')
  }

  get entryPath() {
    return this.#entryPath
  }
  get templatePath() {
    return this.#templatePath
  }
  get actionPath() {
    return this.#actionPath
  }

  async prompt(...args: Parameters<typeof inquirer.prompt>) {
    return inquirer.prompt(...args)
  }

  async install(...args: Parameters<typeof pm.install>) {
    return pm.install(...args)
  }
  async addDependencies(...args: Parameters<typeof pm.addDependencies>) {
    return pm.addDependencies(...args)
  }
  async addDevDependencies(...args: Parameters<typeof pm.addDevDependencies>) {
    return pm.addDevDependencies(...args)
  }
  async removeDependencies(...args: Parameters<typeof pm.removeDependencies>) {
    return pm.removeDependencies(...args)
  }
  async removeDevDependencies(
    ...args: Parameters<typeof pm.removeDevDependencies>
  ) {
    return pm.removeDevDependencies(...args)
  }

  async confirmOverwrites(paths: string[]) {
    const anwsers = await this.prompt([
      {
        type: 'confirm',
        name: 'isConfirm',
        message: () =>
          `以下文件已经存在:\n${paths
            .map((path) => this.color.red(`  ${path}`))
            .join('\n')}\n是否进行覆盖`,
        default: true,
      },
    ])
    const { isConfirm } = anwsers

    return isConfirm
  }

  async renderTemplate(
    templateName: string,
    destinationName: string,
    options: RenderOptions & { overwrites?: boolean } = {},
  ) {
    const { overwrites = false, ...fsOptions } = options
    const templateDir = path.resolve(this.#templatePath, templateName)
    const destinationDir = path.resolve(this.pwd, destinationName)
    if (!overwrites) {
      const existsFiles = await fs.getExistsTemplateFiles(
        templateDir,
        destinationDir,
      )
      if (existsFiles.length > 0) {
        const isOverwrites = await this.confirmOverwrites(existsFiles)
        if (!isOverwrites) {
          throw new Error('Overwrites canceled!')
        }
      }
    }
    await fs.renderTemplate(templateDir, destinationDir, fsOptions)
  }

  async renderTemplateFile(
    templateName: string,
    templateFile: string,
    destinationFile: string,
    options: RenderOptions & { overwrites?: boolean } = {},
  ) {
    const { overwrites = false, ...fsOptions } = options
    const templateFilePath = path.resolve(
      this.#templatePath,
      templateName,
      templateFile,
    )
    const destinationFilePath = path.resolve(this.pwd, destinationFile)
    if (!overwrites) {
      if (await fs.exists(destinationFile)) {
        const isOverwrites = await this.confirmOverwrites([destinationFile])
        if (!isOverwrites) {
          throw new Error('Overwrites canceled!')
        }
      }
    }
    await fs.renderTemplateFile(
      templateFilePath,
      destinationFilePath,
      fsOptions,
    )
  }

  async runTask(
    task: () => Promise<unknown>,
    { cwd = env.cwd }: { cwd?: string } = {},
  ) {
    const oldCwd = env.cwd
    env.changeCwd(cwd ?? env.cwd)
    try {
      await task()
      env.changeCwd(oldCwd)
    } catch (err) {
      env.changeCwd(oldCwd)
      throw err
    }
  }

  async loadingTask(...args: Parameters<typeof oraPromise>) {
    const message = args[1]
    if (typeof message === 'string' && !message.includes('...')) {
      args.splice(1, 1, `${message}...`)
      return oraPromise(...args)
    } else if (typeof message === 'object') {
      return oraPromise(...args).catch(() => null)
    }
  }

  async seriesTask(tasks: Promise<unknown>[]) {
    const results = []
    for (const task of tasks) {
      const result = await task
      results.push(result)
    }
    return results
  }

  async exec(...args: Parameters<typeof cmd.exec>) {
    return this.cmd.exec(...args)
  }

  async installHusky() {
    await this.addDevDependencies(['husky'])
    await this.exec(this.pm.bin, ['husky', 'install'])
  }

  async addCommitLint() {
    await this.addDevDependencies([
      '@commitlint/cli',
      '@commitlint/config-conventional',
    ])
    await this.exec(this.pm.bin, [
      'husky',
      'add',
      'commit-msg',
      `${this.pm.bin} commitlint --edit $1`,
    ])
  }

  async getPluginConfig(pluginName: string, from: LoadFrom = 'local') {
    const rcConfig = await rc.load(from)
    const plugins = (rcConfig?.plugins as unknown[]) ?? []
    const pluginItem = plugins.find((plugin) => {
      if (
        (Array.isArray(plugin) && plugin[0] === pluginName) ||
        (typeof plugin === 'string' && plugin === pluginName)
      ) {
        return true
      }
      return false
    })

    if (pluginItem && Array.isArray(pluginItem)) {
      return pluginItem[1] ?? {}
    }
    return {}
  }

  filename(...args: Parameters<typeof env.filename>) {
    return env.filename(...args)
  }

  dirname(...args: Parameters<typeof env.dirname>) {
    return env.dirname(...args)
  }

  get color() {
    return this.log.color
  }

  get pwd() {
    return env.pwd()
  }

  get homedir() {
    return env.homedir()
  }

  get username() {
    return env.username()
  }

  get log() {
    return log
  }

  get git() {
    return git
  }

  get pm() {
    return pm
  }

  get fs() {
    return fs
  }

  get cmd() {
    return cmd
  }

  get rc() {
    return rc
  }
}

export interface ActionOption {
  option: string
  description: string
  default?: unknown
}

export interface ActionOptions {
  [k: string]: unknown
}
export abstract class Action extends Plugin {
  abstract options: ActionOption[]
  abstract action(options: Record<string, unknown>): Promise<void>
}
