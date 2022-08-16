/**
 * 日志打印模块
 * @author: sunkeysun
 */
import figlet from 'figlet'
import chalk from 'chalk'

function log(msg: string) {
  console.log(msg)
}

export function welcome({ cliName, version }: Record<string, string>) {
  log(chalk.green(figlet.textSync(cliName, { font: 'Kban' })))
  log(chalk.yellow(`welecome ${cliName} v${version} !`))
}

export function info(msg: string) {
  log(chalk.cyan(msg))
}

export function success(msg: string) {
  log(chalk.green(msg))
}

export function error(msg: string) {
  log(chalk.red(msg))
}


