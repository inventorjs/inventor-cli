/**
 * 依赖包管理模块
 * @author: sunkeysun
 */
import path from 'node:path'
import fse from 'fs-extra'
import { execa } from 'execa'
import { error } from './log.js'
import { cwd } from './env.js'

export const bin = 'pnpm'

async function checkPackageJson() {
  const packageJsonPath = path.resolve(cwd, 'package.json');
  if (!await fse.pathExists(packageJsonPath)) {
    throw new Error(`${packageJsonPath} not exist! please check cwd correct!`)
  }
}

export async function init() {
  return execCmd(['init'])
}

export async function install() {
  await checkPackageJson()
  return execCmd(['install'])
}

export async function addDependencies(
  packageNames: string[],
) {
  await checkPackageJson()
  return execCmd(['add', ...packageNames])
}

export async function addDevDependencies(
  packageNames: string[],
) {
  await checkPackageJson()
  return execCmd(['add', ...packageNames, '-D'])
}

export async function removeDependencies(
  packageNames: string[],
) {
  await checkPackageJson()
  return execCmd(['remove', ...packageNames])
}

export async function removeDevDependencies(
  packageNames: string[],
) {
  await checkPackageJson()
  return execCmd(['remove', ...packageNames, '-D'])
}

async function execCmd(args: string[]) {
  const child = execa(bin, args, { cwd, stdio: 'pipe' })
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
