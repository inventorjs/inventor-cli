/**
 * 常用工具模块
 * @author: sunkeysun
 */
export function capitalize(str: string) {
  return str.replace(
    /^(\w)(\w*)/,
    (_, firstChar, restChars) =>
      `${firstChar.toUpperCase()}${restChars.toLowerCase()}`,
  )
}

export function getPluginName(packageName: string) {
  const pluginName = packageName
    .replace('@inventorjs/plugin-', '')
    .replace(/^(@[\w-_]+\/)?inventor-plugin-/g, '')
  return pluginName
}
