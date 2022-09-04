/**
 * 依赖包管理模块
 * @author: sunkeysun
 */
import { type Options, exec } from './cmd.js'

export const bin = 'pnpm'

export async function init(options?: Options) {
  return execBin(['init'], options)
}

export async function install(options?: Options) {
  return execBin(['install'], options)
}

export async function addDependencies(
  packageNames: string[],
  options?: Options,
) {
  return execBin(['add', ...packageNames], options)
}

export async function addDevDependencies(
  packageNames: string[],
  options?: Options,
) {
  return execBin(['add', ...packageNames, '-D'], options)
}

export async function removeDependencies(
  packageNames: string[],
  options?: Options,
) {
  return execBin(['remove', ...packageNames], options)
}

export async function removeDevDependencies(
  packageNames: string[],
  options?: Options,
) {
  return execBin(['remove', ...packageNames, '-D'], options)
}

async function execBin(args: string[], options: Options = {}) {
  const { cwd, stdio = 'pipe' } = options
  return exec(bin, args, {
    ...options,
    cwd,
    stdio,
    pipe: (buf) => {
      const str = buf.toString()
      if (/ERR_PNPM/.test(str)) {
        return { status: 'error', output: str }
      }
      if (/(Progress: resolved|\+{3,}|Virtual store is at|Update available|WARN)/.test(str)) {
        return {}
      }
      return { status: 'data', output: buf }
    },
  })
}
