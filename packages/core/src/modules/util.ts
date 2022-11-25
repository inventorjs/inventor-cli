/**
 * 常用工具模块
 * @author: sunkeysun
 */
import { filesize as fz } from 'filesize'

export function humanSize(bytes: number, options = { base: 2, standard: 'jedec' }) {
  return fz(bytes, options)
}
