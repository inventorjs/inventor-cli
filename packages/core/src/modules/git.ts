/**
 * git 相关操作
 * @author: sunkeysun
 */
import { exec, Options } from './cmd.js'

export const bin = 'git'

export async function init(options?: Options) {
  return await execBin(['init'], options)
}

function execBin(args: string[], options: Options = {}) {
  const { cwd, stdio = 'pipe' } = options
  return exec(bin, args, { cwd, stdio })
}
