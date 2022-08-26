/**
 * 依赖包管理模块
 * @author: sunkeysun
 */
import path from 'node:path'
import fse from 'fs-extra'
import { execa } from 'execa'
import { error } from './log.js'
import { cwd as envCwd } from './env.js'

interface Options {
  cwd?: string
  stdio?: 'pipe' | 'ignore' | 'inherit' | undefined
}

export const bin = 'pnpm'

async function checkPackageJson({ cwd = envCwd }: Pick<Options, 'cwd'> = {}) {
  const packageJsonPath = path.resolve(cwd, 'package.json')
  if (!(await fse.pathExists(packageJsonPath))) {
    throw new Error(`${packageJsonPath} not exist! please check cwd correct!`)
  }
}

export async function init(options?: Options) {
  return exec(bin, ['init'], options, false)
}

export async function install(options?: Options) {
  await checkPackageJson(options)
  return exec(bin, ['install'], options)
}

export async function addDependencies(
  packageNames: string[],
  options?: Options,
) {
  return exec(bin, ['add', ...packageNames], options)
}

export async function addDevDependencies(
  packageNames: string[],
  options?: Options,
) {
  return exec(bin, ['add', ...packageNames, '-D'], options)
}

export async function removeDependencies(
  packageNames: string[],
  options?: Options,
) {
  return exec(bin, ['remove', ...packageNames], options)
}

export async function removeDevDependencies(
  packageNames: string[],
  options?: Options,
) {
  return exec(bin, ['remove', ...packageNames, '-D'], options)
}

async function exec(bin: string, args: string[], options: Options = {}, needPackageJson = true) {
  const { cwd = envCwd, stdio = 'pipe' } = options

  if (needPackageJson) {
    await checkPackageJson({ cwd })
  }

  const child = execa(bin, args, { cwd, stdio })
  let isError = false
  return new Promise((resolve, reject) => {
    child.stdout?.on('data', (buf) => {
      const str = buf.toString()
      if (/ERR_PNPM/.test(str)) {
        isError = true
        error(str)
        reject()
        return
      }
      if (/(Progress: resolved|\+{3,}|Virtual store is at)/.test(str)) {
        return
      }
      !isError && process.stdout.write(buf)
    })
    child.stdout?.on('end', () => {
      resolve(null)
    })
  })
}
