/**
 * 文件操作
 * @author: sunkeysun
 */
import path from 'node:path'
import fse from 'fs-extra'
import { globby } from 'globby'
import ejs from 'ejs'

export interface RenderOptions {
  data?: Record<string, unknown>
}

export const readdir = fse.readdir
export const readFile = fse.readFile

export async function getAllFiles(dirPath: string) {
  const allFiles = await globby(`${dirPath}/**/(.)?*`, { gitignore: false })
  return allFiles
}

export async function getExistsTemplateFiles(templateDir: string, destinationDir: string) {
  const templateFiles = await getAllFiles(templateDir)
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
  const templateFiles = await getAllFiles(templateDir)
  const tmpDestinationDir = path.resolve('/tmp/inventor-templates/', `template-${Date.now()}`)
  await fse.ensureDir(tmpDestinationDir)

  for (const templateFile of templateFiles) {
    const destinationFile = path.resolve(
      tmpDestinationDir,
      templateFile.replace(templateDir, '').slice(1),
    )
    await fse.ensureDir(path.dirname(destinationFile))
    await renderTemplateFile(templateFile, destinationFile, options)
  }
  await fse.copy(tmpDestinationDir, destinationDir)
  await fse.remove(tmpDestinationDir)
}

export async function renderTemplateFile(
  templateFile: string,
  destinationFile: string,
  options: RenderOptions = {},
) {
  const { data = {} } = options
  const renderContent = await ejs.renderFile(templateFile, data, { async: true })
  await fse.ensureDir(path.dirname(destinationFile))
  await fse.writeFile(destinationFile, renderContent)
}
