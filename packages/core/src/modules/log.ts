/**
 * 日志打印模块
 * @author: sunkeysun
 */
import type { Options as BoxenOptions } from 'boxen'

interface Options {
  boxen: BoxenOptions | true
}

import chalk from 'chalk'
import boxen from 'boxen'

function log(msg: unknown, options?: Options) {
  let realMeg = msg
  if (options?.boxen) {
    const boxenOptions = options.boxen
    if (boxenOptions === true) {
      realMeg = boxen(msg as string, { padding: 1, borderColor: 'green' })
    } else {
      realMeg = boxen(msg as string, boxenOptions)
    }
  }
  console.log(realMeg)
}

export const color = chalk

export function bye(msg: unknown, options?: Options) {
  log(`👋 ${color.green(msg)}`, options)
  process.exit()
}

export function info(msg: unknown, options?: Options) {
  log(`🌎 ${color.cyan(msg)}`, options)
}

export function success(msg: unknown, options?: Options) {
  log(`✅ ${color.green(msg)}`, options)
}

export function error(msg: unknown, options?: Options) {
  log(`❌ ${color.red(msg)}`, options)
}

export function clear() {
  log(process.platform === 'win32' ? '\x1B[2J\x1B[0f' : '\x1B[2J\x1B[3J\x1B[H') 
}

export function raw(msg: unknown, options?: Options) {
  log(msg, options)
}

