/**
 * 日志打印模块
 * @author: sunkeysun
 */
import chalk from 'chalk'

function log(msg: string) {
  console.log(msg)
}

export const color = chalk

export function bye(msg: string) {
  log(`👋 ${color.green(msg)}`)
  process.exit()
}

export function info(msg: string) {
  log(`🌎 ${color.cyan(msg)}`)
}

export function success(msg: string) {
  log(`✅ ${color.green(msg)}`)
}

export function error(msg: string) {
  log(`❌ ${color.red(msg)}`)
}

export function raw(msg: string) {
  log(msg)
}

