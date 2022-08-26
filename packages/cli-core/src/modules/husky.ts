/**
 * husky 相关操作
 * @author: sunkeysun
 */
import { execa } from 'execa'

interface Options {
  cwd: string
}

export const bin = 'pnpm'

export async function install({ cwd }: Options) {
  return exec(bin, ['husky', 'install'], { cwd })
}

export async function uninstall({ cwd }: Options) {
  return exec(bin, ['husky', 'uninstall'], { cwd })
}

export async function add(hookName: string, hookAction: string, { cwd }: Options) {
  return exec(bin, ['husky', 'add', `.husky/${hookName}`, hookAction], { cwd })
}

function exec(bin: string, args: string[], { cwd }: Options) {
  const child = execa(bin, args, { cwd, stdio: 'pipe' })
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
