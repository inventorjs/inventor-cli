/**
 * 文件操作
 * @author: sunkeysun
 */
import { mkdirp, copy } from 'fs-extra'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { globby } from 'globby'
import ejs from 'ejs'

async function sleep() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(0)
    }, 10000)
  })
}

export async function getAllFiles(dirPath: string) {
  const allFiles = await globby(`${dirPath}/**/*`)
  return allFiles
}

export async function renderTemplate(templateDir: string, destinationDir: string, templateData: Record<string, unknown>) {
  const templateFiles = await getAllFiles(templateDir)
  const tmpDestinationDir = path.resolve('/tmp', `inventor-template`)

  for (const templateFile of templateFiles) {
    const renderContent = await ejs.renderFile(templateFile, templateData, { async: true })
    const destinationFile = path.resolve(tmpDestinationDir, templateFile.replace(templateDir, '').slice(1))
    mkdirp(path.dirname(destinationFile))
    await writeFile(destinationFile, renderContent)
  }
  await copy(tmpDestinationDir, destinationDir)
}
