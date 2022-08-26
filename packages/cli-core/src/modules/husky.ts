/**
 * husky 相关操作
 * @author: sunkeysun
 */
import { execa } from 'execa'
import { cwd as envCwd } from './env.js'

interface Options {
  cwd?: string
  stdio?: 'pipe' | 'ignore' | 'inherit'
}

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

function exec(bin: string, args: string[], options: Options = {}) {
  const { cwd = envCwd, stdio = 'pipe' } = options
  const child = execa(bin, args, { cwd, stdio })
  return new Promise((resolve, reject) => {
    child.stdout?.on('data', (buf) => {
      process.stdout.write(buf)
    })
    child.stdout?.on('end', () => {
      resolve(null)
    })
    child.stdout?.on('error', () => {
      reject()
    })
  })
}
