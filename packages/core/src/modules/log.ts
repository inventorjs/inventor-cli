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

function log(msg: string, options: Options = {}) {
  let exMsg = msg
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
    const defaultOptions = { padding: 1, borderColor: 'green' }
    if (boxenOptions === true) {
      exMsg = boxen(exMsg, defaultOptions)
    } else {
      exMsg = boxen(exMsg, { ...defaultOptions, ...boxenOptions })
    }
  }
  console.log(exMsg)
}

function stringify(msg: unknown) {
  let strMsg = ''
  if (Array.isArray(msg) && msg[0]) {
    const maxLengthArr = Object.keys(msg[0]).reduce((result, col) => {
      let maxLength = 0
      msg.forEach((item: string[]) => {
        if (item[+col]?.length > maxLength) {
          maxLength = item[+col].length
        }
      })
      return [...result, maxLength]
    }, [] as number[])

    strMsg = msg.reduce((result, item) => {
      return [
        ...result,
        item.map((it: string, index: number) => it.padEnd(maxLengthArr[index], ' ')).join(' '),
      ]
    }, []).join('\n')
  } else if (typeof msg === 'object') {
    try {
      strMsg = JSON.stringify(msg)
    } catch (err) {// continue
    }
  } else {
    strMsg = String(msg)
  }
  return strMsg
}

export const color = chalk

export function bye(msg: unknown, options?: Options) {
  log(`👋 ${color.green(stringify(msg))}`, options)
  process.exit()
}

export function info(msg: unknown, options?: Options) {
  log(`💧 ${color.cyan(stringify(msg))}`, options)
}

export function success(msg: unknown, options?: Options) {
  log(`🎉 ${color.green(stringify(msg))}`, options)
}

export function error(msg: unknown, options?: Options) {
  log(`❗${color.red(stringify(msg))}`, options)
}

export function warn(msg: unknown, options?: Options) {
  log(`⚠️ ${color.yellow(stringify(msg))}`, options)
}

export function clear() {
  log(process.platform === 'win32' ? '\x1B[2J\x1B[0f' : '\x1B[2J\x1B[3J\x1B[H') 
}

export function raw(msg: unknown, options?: Options) {
  log(stringify(msg), options)
}
