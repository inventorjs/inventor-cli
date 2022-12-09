/**
 * 常用工具模块
 * @author: sunkeysun
 */
import { filesize as fz } from 'filesize'

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
