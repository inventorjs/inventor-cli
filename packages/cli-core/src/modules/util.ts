/**
 * 常用工具模块
 * @author: sunkeysun
 */
import { filesize as fz } from 'filesize'
import dayjs from 'dayjs'
import { readFile, writeFile, exists } from './fs.js'

export function getPluginName(packageName: string) {
  if (
    !/@inventorjs\/plugin-(\w+)/.test(packageName) &&
    !/^(@[\w-_]+\/)?inventor-plugin-(\w+)/.test(packageName)
  ) {
    return ''
  }

  const pluginName = packageName
    .replace('@inventorjs/plugin-', '')
    .replace(/^(@[\w-_]+\/)?inventor-plugin-/g, '')
  return pluginName
}

export function humanSize(
  bytes: number,
  options = { base: 2, standard: 'jedec' },
) {
  return fz(bytes, options)
}

export function pascalCase(str: string) {
  return str
    .split(/[-_]/)
    .map((seg) => `${seg[0].toUpperCase()}${seg.substring(1)}`)
    .join('')
}

export function dateFormat(timestamp: number, format = 'YYYY-MM-DD HH:mm:ss') {
  return dayjs(timestamp).format(format)
}

export async function updateEnvFile(
  filePath: string,
  updateData: Record<string, unknown>,
) {
  let envData = await parseEnvFile(filePath)
  envData = { ...envData, ...updateData }
  const result = Object.entries(envData)
    .map(([key, val]) => `${key}=${val}`)
    .join('\n')
  await writeFile(filePath, result)
}

export async function parseEnvFile(filePath: string) {
  let envData: Record<string, unknown> = {}
  if (await exists(filePath)) {
    ;(await readFile(filePath, 'utf8')).split('\n').forEach((line) => {
      const [key, val] = line.split('=')
      envData[String(key).trim()] = String(val).trim()
    })
  }
  return envData
}
