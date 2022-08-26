/**
 * git 相关操作
 * @author: sunkeysun
 */
import { execa } from 'execa'
import { cwd as envCwd } from './env.js'

interface Options {
  cwd?: string
  stdio?: 'pipe' | 'ignore' | 'inherit'
}

export const bin = 'git'

export async function init(options?: Options) {
  return await exec(bin, ['init'], options)
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
