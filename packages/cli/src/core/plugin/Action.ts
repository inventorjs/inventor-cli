/**
 * Action 抽象类
 * @author: sunkeysun
 */
import path from 'node:path'
import { oraPromise } from 'ora'
import { prompts } from '../prompts.js'
import { renderTemplate } from '../fs.js'
import { pwd, homedir, filename, dirname, username } from '../env.js'
import { install } from '../pm.js'

export interface ActionOption {
  option: string
  description: string
  default?: unknown 
}

export interface ActionConstructParams {
  root: string
}

export type PromptsParameter = Parameters<typeof prompts>[0]
export interface InstallOptions { root: string }
export interface InstallPackageOptions extends InstallOptions { global?: boolean }

export default abstract class Action {
  abstract name: string
  abstract description: string
  abstract options?: ActionOption[]
  abstract action(options: Record<string, unknown>): Promise<void>

  #root: string

  constructor({ root }: ActionConstructParams) {
    this.#root = root
  }

  async prompts(questions: PromptsParameter) {
    if (!questions || (Array.isArray(questions) && !questions.length)) {
      return {}
    }
    return prompts(questions)
  }

  async loading(...args: Parameters<typeof oraPromise>) {
    return oraPromise.apply(null, args)
  }

  async install({ root }: { root: string }) {
    await install({ root })
  }
  async addDependencies(packageNames: string[], options: InstallPackageOptions) {}
  async addDevDependencies(packageNames: string[], options: InstallPackageOptions) {}
  async removeDependencies(packageNames: string[], options: InstallPackageOptions) {}
  async removeDevDependencies(packageNames: string[], options: InstallPackageOptions) {}

  get templatePath() {
    return path.resolve(this.#root, 'templates')
  }

  async renderTemplate(templateName: string, destinationPath: string, templateData: Record<string, unknown>) {
    const templateDir = path.resolve(this.templatePath, templateName)
    const destinationDir = path.resolve(pwd(), destinationPath)
    await renderTemplate(templateDir, destinationDir, templateData)
  }

  pwd() { return pwd() }
  homedir() { return homedir() }
  filename(metaUrl: string) { return filename(metaUrl) }
  dirname(metaUrl: string) { return dirname(metaUrl) }
  username() { return username() }
}
