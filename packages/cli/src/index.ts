/**
 * inventor 命令行入口
 * @author: sunkeysun
 */
import { Command } from 'commander'
import * as plugin from './plugins/plugin'
import packageJson from '../package.json' assert { type: 'json' }

const cli = new Command('inventor')

cli.version(packageJson.version)

;(async () => {
  const initOptions = await plugin.getInitOptions()
  let cmd = cli.command(initOptions.name)

  initOptions.options.forEach((option) => cmd.option(option.option, option.description))
  cmd.action((action) => initOptions.action(action))

  cli.parse(process.argv)
})()



