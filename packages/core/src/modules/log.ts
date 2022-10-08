/**
 * 日志打印模块
 * @author: sunkeysun
 */
import type { Options as BoxenOptions } from 'boxen'
import chalk from 'chalk'
import boxen from 'boxen'
import dedent from 'dedent'
import figlet from 'figlet'

interface Options {
  boxen?: BoxenOptions | true
  dedent?: boolean
  art?: figlet.Options & { color: 'green' | 'cyan' }
}

const defaultOptions = { dedent: true }

function log(msg: unknown, options: Options = {}) {
  let exMsg = String(msg)
  const exOptions = { ...defaultOptions, ...options }
  if (exOptions?.dedent) {
    exMsg = dedent(exMsg)
  }
  if (exOptions?.art) {
    const { color, ...figletOptions} = exOptions.art
    exMsg = figlet.textSync(exMsg, figletOptions) 
    if (color) {
      exMsg = chalk[color](exMsg)
    }
  }
  if (exOptions?.boxen) {
    const boxenOptions = options.boxen
    if (boxenOptions === true) {
      exMsg = boxen(exMsg, { padding: 1, borderColor: 'green' })
    } else {
      exMsg = boxen(exMsg, boxenOptions)
    }
  }
  console.log(exMsg)
}

export const color = chalk

export function bye(msg: unknown, options?: Options) {
  log(`👋 ${color.green(msg)}`, options)
  process.exit()
}

export function info(msg: unknown, options?: Options) {
  log(`💧 ${color.cyan(msg)}`, options)
}

export function success(msg: unknown, options?: Options) {
  log(`🎉 ${color.green(msg)}`, options)
}

export function error(msg: unknown, options?: Options) {
  log(`❗${color.red(msg)}`, options)
}

export function clear() {
  log(process.platform === 'win32' ? '\x1B[2J\x1B[0f' : '\x1B[2J\x1B[3J\x1B[H') 
}

export function raw(msg: unknown, options?: Options) {
  log(msg, options)
}
