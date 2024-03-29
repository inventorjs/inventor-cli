/**
 * 文件操作
 * @author: sunkeysun
 */
import path from 'node:path'
import fse from 'fs-extra'
import fg from 'fast-glob'
import ejs from 'ejs'
import { pwd } from './env.js'

export interface RenderOptions {
  data?: Record<string, unknown>
  includes?: string[]
  excludes?: string[]
}

export const readdir = fse.readdir
export const readFile = fse.readFile
export const writeFile = fse.writeFile
export const stat = fse.stat

export async function getAllFiles(dirPath: string, options: Pick<RenderOptions, 'includes' | 'excludes'> = {}) {
  const { includes = [], excludes = [] } = options
  const allFiles = await fg(`${dirPath}/**/*`, { dot: true })
  if (includes.length) {
    const realIncludes: string[] = []
    for (const include of includes) {
      realIncludes.push(...(await fg(path.resolve(dirPath, include), { dot: true })))
    }
    return allFiles.filter((file) => realIncludes.includes(file))
  } else if (excludes.length) {
    const realExcludes: string[] = []
    for (const exclude of excludes) {
      realExcludes.push(...(await fg(path.resolve(dirPath, exclude), { dot: true})))
    }
    return allFiles.filter((file) => !realExcludes.includes(file))
  }
  return allFiles
}

export async function getExistsTemplateFiles(
  templateDir: string,
  destinationDir: string,
  options: Pick<RenderOptions, 'includes' | 'excludes'>,
) {
  const templateFiles = await getAllFiles(templateDir, options)
  const existsPaths = []
  for (const templateFile of templateFiles) {
    const destinationFile = path.resolve(
      destinationDir,
      templateFile.replace(templateDir, '').slice(1),
    )
    if (await exists(destinationFile)) {
      existsPaths.push(destinationFile)
    }
  }
  if (existsPaths.length > 0) {
    return existsPaths
  }
  return []
}

export async function exists(filePath: string) {
  return await fse.pathExists(filePath)
}

export async function renderTemplate(
  templateDir: string,
  destinationDir: string,
  options: RenderOptions = {},
) {
  const templateFiles = await getAllFiles(templateDir, options)
  const tmpDestinationDir =
    destinationDir === pwd()
      ? destinationDir
      : path.resolve('/tmp/inventor-templates/', `template-${Date.now()}`)
  await fse.ensureDir(tmpDestinationDir)

  for (const templateFile of templateFiles) {
    const destinationFile = path.resolve(
      tmpDestinationDir,
      templateFile.replace(templateDir, '').slice(1),
    )
    await fse.ensureDir(path.dirname(destinationFile))
    await renderTemplateFile(templateFile, destinationFile, options)
  }
  if (destinationDir !== pwd()) {
    await fse.move(tmpDestinationDir, destinationDir)
  }
}

export async function renderTemplateFile(
  templateFile: string,
  destinationFile: string,
  options: RenderOptions = {},
) {
  const { data = {} } = options
  const renderContent = await ejs.renderFile(templateFile, data, {
    async: true,
  })
  await fse.ensureDir(path.dirname(destinationFile))
  await fse.writeFile(destinationFile, renderContent)
}
