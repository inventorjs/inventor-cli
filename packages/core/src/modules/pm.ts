/**
 * 依赖包管理模块
 * @author: sunkeysun
 */
import path from 'node:path'
import { cwd } from './env.js'
import { type Options, exec } from './cmd.js'
import { readFile, writeFile, readdir } from './fs.js'
import { context } from './env.js'

export const bin = 'pnpm'

export async function addPackageJsonFields(
  fieldsData: Record<string, unknown>,
  filePath = cwd,
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
  let parentDir = path.dirname(fromPath)
  let packageJson: Record<string, unknown> | null = null
  while (parentDir !== '/') {
    const files = await readdir(parentDir)
    const packageJsonFile = files.find((file) => file === 'package.json')
    if (packageJsonFile) {
      packageJson = await getPackageJson(packageJsonFile)
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
  const { stdout: rootPath } = (await exec(bin, args, { output: false })) as {
    stdout: string
  }
  return rootPath
}

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
