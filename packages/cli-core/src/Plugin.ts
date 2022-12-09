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
import * as util from './modules/util.js'
import * as regex from './modules/regex.js'

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
    return this.loadingTask(pm.install(...args), '安装依赖')
  }
  async addDependencies(...args: Parameters<typeof pm.addDependencies>) {
    return this.loadingTask(pm.addDependencies(...args), '安装依赖')
  }
  async addDevDependencies(...args: Parameters<typeof pm.addDevDependencies>) {
    return this.loadingTask(pm.addDevDependencies(...args), '安装依赖')
  }
  async removeDependencies(...args: Parameters<typeof pm.removeDependencies>) {
    return this.loadingTask(pm.removeDependencies(...args), '移除依赖')
  }
  async getPackageJson(fromPath = this.#entryPath) {
    const result = await pm.searchPackageJson(fromPath)
    if (!result) {
      return null
    }
    return result.content
  }

  async addPackageJsonFields(
    ...args: Parameters<typeof pm.addPackageJsonFields>
  ) {
    return pm.addPackageJsonFields(...args)
  }
  async savePackageJson(...args: Parameters<typeof pm.savePackageJson>) {
    return pm.savePackageJson(...args)
  }
  async getPackageName(fromPath = this.#entryPath) {
    const packageJson = await this.getPackageJson(fromPath)
    if (!packageJson) return ''
    const packageName = packageJson.name as string
    return packageName
  }
  async getPluginName(fromPath = this.#entryPath) {
    const packageName = await this.getPackageName(fromPath)
    if (!packageName) return ''
    return util.getPluginName(packageName);
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
    return this.loadingTask(
      fs.renderTemplate(templateDir, destinationDir, fsOptions),
      '生成模板目录',
    )
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
    return this.loadingTask(
      fs.renderTemplateFile(templateFilePath, destinationFilePath, fsOptions),
      '生成模版文件',
    )
  }

  async runTaskContext(
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
    let message = args[1]
    if (!message) {
      message = 'Loading'
    }
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

  async initGit() {
    return this.loadingTask(git.init(), '初始化 Git')
  }

  async addHusky() {
    if (await fs.exists(path.resolve(env.cwd, '.husky'))) return true

    return this.loadingTask(async () => {
      if (!await fs.exists(path.resolve(env.cwd, '.git'))) {
        await git.init()
      }
      await pm.addDevDependencies(['husky'])
      await cmd.exec(pm.BIN, ['husky', 'install'])
    }, '安装 Husky')
  }

  async addCommitLint() {
    return this.loadingTask(async () => {
      await this.addHusky()
      await pm.addDevDependencies([
        '@commitlint/cli',
        '@commitlint/config-conventional',
      ])
      await cmd.exec(pm.BIN, [
        'husky',
        'add',
        '.husky/commit-msg',
        `${pm.BIN} commitlint --edit $1`,
      ])
      await pm.addPackageJsonFields(env.cwd, {
        commitlint: { extends: '@commitlint/config-conventional' },
      })
    }, '安装 Commitlint')
  }

  async addEslint() {
    return this.loadingTask(async () => {
      await this.addHusky()
      await pm.addDevDependencies([
        'eslint',
        'eslint-config-prettier',
        '@typescript-eslint/eslint-plugin',
        '@typescript-eslint/parser',
        'lint-staged',
      ])
      await cmd.exec(pm.BIN, [
        'husky',
        'add',
        '.husky/pre-commit',
        `${pm.BIN} lint-staged -c package.json`,
      ])
      await pm.addPackageJsonFields(env.cwd, { 'lint-staged': { '*.ts(x)?': 'eslint' } })
      await fs.writeFile('.eslintrc', JSON.stringify({
        "root": true,
        "env": {
          "node": true,
          "browser": true,
          "es6": true,
        },
        "extends": [
          "eslint:recommended",
          "plugin:@typescript-eslint/recommended",
          "prettier"
        ],
        "parser": "@typescript-eslint/parser",
        "plugins": ["@typescript-eslint"]
      }, null, 2))
    }, '安装 Eslint')
  }

  async getPluginConfig(from: LoadFrom = 'local') {
    const rcConfig = await rc.load(from)
    const plugins = (rcConfig?.plugins as unknown[]) ?? []
    const packageName = await this.getPackageName()
    const pluginItem = plugins.find((plugin) => {
      if (
        (Array.isArray(plugin) && plugin[0] === packageName) ||
        (typeof plugin === 'string' && plugin === packageName)
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

  async logInitCmd({ dirName = '.', cmd = `${this.pm.BIN} dev` } = {}) {
    this.log.success('Init successful. Start develop to run:')
    this.log.raw(
      `
        cd ${dirName}
        ${cmd}
      `,
      { boxen: true },
    )
  }

  get __Plugin__() {
    return this
  }

  get color() {
    return log.color
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

  get isTTY() {
    return env.isTTY()
  }

  get context() {
    return env.context()
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

  get util() {
    return util
  }

  get regex() {
    return regex
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
  #plugin: Plugin
  abstract options: ActionOption[]
  abstract action(options: Record<string, unknown>, args: string[]): Promise<void>

  constructor({ plugin, entryPath }: { entryPath: string; plugin: Plugin }) {
    super({ entryPath })
    this.#plugin = plugin
  }

  get plugin() {
    return this.#plugin
  }

  get __Action__() {
    return this
  }
}
