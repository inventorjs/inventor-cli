/**
 * 常用工具模块
 * @author: sunkeysun
 */
export async function capitalize(str: string) {
  return str.replace(
    /^(\w)(\w*)/,
    (_, firstChar, restChars) => `${firstChar.toUpperCase()}${restChars.toLowerCase()}`,
  )
}
