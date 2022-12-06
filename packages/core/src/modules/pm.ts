/**
 * 依赖包管理模块
 * @author: sunkeysun
 */
import path from 'node:path'
import { type Options, exec } from './cmd.js'
import { readFile, writeFile, readdir, stat } from './fs.js'
import { context } from './env.js'
import semver from 'semver'

export interface AddOptions extends Options {
  global?: boolean
}

export const BIN = 'pnpm'
const VERSION = '^7.12.0'

export async function checkVersion() {
  let version = ''
  try {
    ({ stdout: version } = await exec(BIN, ['-v'], { output: false }) as { stdout: string })
  } catch (err) {
    throw new Error(`${BIN}@${VERSION} is required globally. try "corepack prepare ${BIN}@${VERSION} --activate" to fix.`)
  }
  if (!semver.satisfies(version, VERSION)) {
    throw new Error(`pnpm current version[${version}] not satisfy required [${VERSION}].`)
  }
}

export async function addPackageJsonFields(
  filePath: string,
  fieldsData: Record<string, unknown>,
) {
  let packageJson = await getPackageJson(filePath)
  if (!packageJson) return

  packageJson = { ...packageJson, ...fieldsData }
  await savePackageJson(filePath, packageJson)
}

export async function getPackageJson(packageJsonPath: string) {
  let filePath = packageJsonPath
  if (!packageJsonPath.endsWith('package.json')) {
    filePath = path.resolve(packageJsonPath, 'package.json')
  }
  try {
    const fileContent = await readFile(filePath, 'utf8')
    const packageJson = JSON.parse(fileContent)
    return packageJson
  } catch (err) {
    return null
  }
}

export async function savePackageJson(
  savePath: string,
  packageJson: Record<string, unknown>,
) {
  let filePath = savePath
  if (!savePath.endsWith('package.json')) {
    filePath = path.resolve(savePath, 'package.json')
  }
  const fileContent = JSON.stringify(packageJson, null, 2)
  await writeFile(filePath, fileContent)
}

export async function searchPackageJson(fromPath: string) {
  const fsStat = await stat(fromPath)
  let parentDir = fsStat.isDirectory() ? fromPath : path.dirname(fromPath)
  let packageJson: Record<string, unknown> | null = null
  while (parentDir !== '/') {
    const files = await readdir(parentDir)
    const packageJsonFile = files.find((file) => file === 'package.json')
    if (packageJsonFile) {
      packageJson = await getPackageJson(path.resolve(parentDir, packageJsonFile))
      if (!packageJson) return null
      return { path: path.resolve(parentDir, packageJsonFile), content: packageJson }
    }
    parentDir = path.dirname(parentDir)
  }
  return null
}

export async function root() {
  const args = ['root']
  const ctx = context()
  if (ctx === 'global') {
    args.push('-g')
  }
  const { stdout: rootPath } = (await exec(BIN, args, { output: false })) as {
    stdout: string
  }
  return rootPath
}

export async function init(options?: Options) {
  return execBin(['init'], options)
}

export async function install(options?: Options) {
  const args = ['install']
  return execBin(args, options)
}

export async function addDependencies(
  packageNames: string[],
  options: AddOptions = {},
) {
  const { global = false, ...restOptions } = options;
  const args = ['add', ...packageNames]
  !!global && args.push('-g')
  return execBin(args, restOptions)
}

export async function addDevDependencies(
  packageNames: string[],
  options: AddOptions = {},
) {
  const { global = false, ...restOptions } = options;
  const args = ['add', ...packageNames, '-D']
  !!global && args.push('-g')
  return execBin(args, restOptions)
}

export async function removeDependencies(
  packageNames: string[],
  options: AddOptions = {},
) {
  const { global = false, ...restOptions } = options;
  const args = ['remove', ...packageNames]
  !!global && args.push('-g')
  return execBin(args, restOptions)
}

export async function removeDevDependencies(
  packageNames: string[],
  options: AddOptions = {},
) {
  const { global = false, ...restOptions } = options;
  const args = ['remove', ...packageNames]
  !!global && args.push('-g')
  return execBin(args, restOptions)
}

async function execBin(args: string[], options: Options = {}) {
  const { cwd, stdio = 'pipe' } = options
  return exec(BIN, args, {
    ...options,
    cwd,
    stdio,
    pipe: (buf) => {
      const str = buf.toString()
      if (/ERR_PNPM/.test(str)) {
        return { status: 'error', output: str }
      }
      if (
        /(Progress: resolved|\+{3,}|Virtual store is at|Update available|WARN)/.test(
          str,
        )
      ) {
        return {}
      }
      return { status: 'data', output: buf }
    },
  })
}
