/**
 * Action 抽象类
 * @author: sunkeysun
 */
import path from 'node:path'
import { oraPromise } from 'ora'
import prompts from 'prompts'
import * as fs from '../fs.js'
import * as env from '../env.js'
import * as log from '../log.js'
import * as git from '../git.js'
import * as pm from '../pm.js'

export interface ActionOption {
  option: string
  description: string
  default?: unknown
}

export interface ActionConstructParams {
  pluginRoot: string
}

export type PromptsParameter = Parameters<typeof prompts>[0]
export type PromptsOptions = Parameters<typeof prompts>[1]

export default abstract class Action {
  abstract description: string
  abstract options?: ActionOption[]
  abstract action(options: Record<string, unknown>): Promise<void>

  #pluginRoot: string

  constructor({ pluginRoot }: ActionConstructParams) {
    this.#pluginRoot = pluginRoot
  }

  async prompts(
    questions: PromptsParameter,
    options: PromptsOptions = { onCancel: () => process.exit(1) },
  ) {
    if (!questions || (Array.isArray(questions) && !questions.length)) {
      return {}
    }
    return prompts(questions, options)
  }

  async loading(...args: Parameters<typeof oraPromise>) {
    return oraPromise(...args)
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

  get templatePath() {
    return path.resolve(this.#pluginRoot, '../templates')
  }
  async renderTemplate(
    templateName: string,
    destinationName: string,
    templateData: Record<string, unknown> = {},
  ) {
    const templateDir = path.resolve(this.templatePath, templateName)
    const destinationDir = path.resolve(this.pwd, destinationName)
    return fs.renderTemplate(templateDir, destinationDir, templateData)
  }
  async renderTemplateFile(
    templateFile: string,
    destinationFile: string,
    templateData: Record<string, unknown> = {},
  ) {
    return fs.renderTemplateFile(templateFile, destinationFile, templateData)
  }

  filename(...args: Parameters<typeof env.filename>) {
    return env.filename(...args)
  }
  dirname(...args: Parameters<typeof env.dirname>) {
    return env.dirname(...args)
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
}
