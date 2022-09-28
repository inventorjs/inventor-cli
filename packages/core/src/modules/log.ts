/**
 * 日志打印模块
 * @author: sunkeysun
 */
import type { Options as BoxenOptions } from 'boxen'

interface Options {
  boxen?: BoxenOptions | true
  dedent?: boolean
}

import chalk from 'chalk'
import boxen from 'boxen'
import dedent from 'dedent'

const defaultOptions = { dedent: true }

function log(msg: unknown, options: Options = {}) {
  let realMsg = String(msg)
  const realOptions = { ...defaultOptions, ...options }
  if (realOptions?.dedent) {
    realMsg = dedent(realMsg)
  }
  if (realOptions?.boxen) {
    const boxenOptions = options.boxen
    if (boxenOptions === true) {
      realMsg = boxen(realMsg, { padding: 1, borderColor: 'green' })
    } else {
      realMsg = boxen(realMsg, boxenOptions)
    }
  }
  console.log(realMsg)
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

