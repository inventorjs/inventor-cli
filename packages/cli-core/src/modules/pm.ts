/**
 * 依赖包管理模块
 * @author: sunkeysun
 */
import { execa } from 'execa'
import { error } from './log.js'

export const bin = 'pnpm'

interface InstallOptions {
  cwd: string
}

export async function init({ cwd }: InstallOptions) {
  return execCmd(bin, ['init'], cwd)
}

export async function install({ cwd }: InstallOptions) {
  return execCmd(bin, ['install'], cwd)
}

export async function addDependencies(
  packageNames: string[],
  { cwd }: InstallOptions,
) {
  return execCmd(bin, ['add', ...packageNames], cwd)
}

export async function addDevDependencies(
  packageNames: string[],
  { cwd }: InstallOptions,
) {
  return execCmd(bin, ['add', ...packageNames, '-D'], cwd)
}

export async function removeDependencies(
  packageNames: string[],
  { cwd }: InstallOptions,
) {
  return execCmd(bin, ['remove', ...packageNames], cwd)
}

export async function removeDevDependencies(
  packageNames: string[],
  { cwd }: InstallOptions,
) {
  return execCmd(bin, ['remove', ...packageNames, '-D'], cwd)
}

function execCmd(cmd: string, args: string[], cwd: string) {
  const child = execa(cmd, args, { cwd, stdio: 'pipe' })
  let isError = false
  return new Promise((resolve, reject) => {
    child.stdout?.on('data', (buf) => {
      const str = buf.toString()
      if (/ERR_PNPM/.test(str)) {
        isError = true
        error(str)
        reject()
        return ;
      }
      !isError && process.stdout.write(buf)
    })
    child.stdout?.on('end', () => {
      resolve(null)
    })
  })
}
