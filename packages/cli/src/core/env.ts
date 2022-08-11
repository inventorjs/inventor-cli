/**
 * 获取当前环境信息
 * @author: sunkeysun
 */
import os from 'os'

export function cwd() {
  return process.cwd()
}

export function home() {
  return os.homedir()
}
