/**
 * 文件操作
 * @author: sunkeysun
 */
import path from 'node:path'
import fse from 'fs-extra'
import { globby } from 'globby'
import ejs from 'ejs'

export async function getAllFiles(dirPath: string) {
  const allFiles = await globby(`${dirPath}/**/(.)?*`, { gitignore: false })
  return allFiles
}

export async function renderTemplate(
  templateDir: string,
  destinationDir: string,
  templateData: Record<string, unknown>
) {
  const templateFiles = await getAllFiles(templateDir)
  const tmpDestinationDir = path.resolve('/tmp/inventor-templates/', `template-${Date.now()}`)

  await fse.ensureDir(tmpDestinationDir)

  for (const templateFile of templateFiles) {
    const destinationFile = path.resolve(tmpDestinationDir, templateFile.replace(templateDir, '').slice(1))
    await fse.ensureDir(path.dirname(destinationFile))
    await renderTemplateFile(templateFile, destinationFile, templateData)
  }
  await fse.copy(tmpDestinationDir, destinationDir)
  await fse.remove(tmpDestinationDir)
}

export async function renderTemplateFile(
  templateFile: string,
  destinationFile: string,
  templateData: Record<string, unknown>,
) {
  const renderContent = await ejs.renderFile(templateFile, templateData, { async: true })
  await fse.writeFile(destinationFile, renderContent)
}
