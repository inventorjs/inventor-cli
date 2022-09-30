/**
 * 获取当前环境信息
 * @author: sunkeysun
 */
import os from 'node:os'
import { fileURLToPath } from 'node:url'

let cwd  = process.cwd()

export function pwd() {
  return process.cwd()
}

export function homedir() {
  return os.homedir()
}

export function packageRoot() {
  const ctx = context()
}

export function context() {
  return process.env.npm_config_user_agent ? 'local' : 'global'
}

export function username() {
  return os.userInfo().username
}

export function uid() {
  return os.userInfo().uid
}

export function dirname(metaUrl: string) {
  const dirUrl = new URL('.', metaUrl)
  return fileURLToPath(dirUrl)
}

export function filename(metaUrl: string) {
  return fileURLToPath(metaUrl)
}

export function changeCwd(enterCwd: string) {
  cwd = enterCwd
}

export { cwd }
