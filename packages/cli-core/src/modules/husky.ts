/**
 * husky 相关操作
 * @author: sunkeysun
 */
import { type Options, exec } from './cmd.js'

export const bin = 'pnpm'

export async function install(options?: Options) {
  return exec(bin, ['husky', 'install'], options)
}

export async function uninstall(options?: Options) {
  return exec(bin, ['husky', 'uninstall'], options)
}

export async function add(hookName: string, hookAction: string, options?: Options) {
  return exec(bin, ['husky', 'add', `.husky/${hookName}`, hookAction], options)
}
