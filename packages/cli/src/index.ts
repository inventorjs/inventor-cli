/**
 * inventor 命令行入口
 * @author: sunkeysun
 */
import { Command } from 'commander'
import { plugin } from './core/index.js'
import packageJson from '../package.json' assert { type: 'json' }

const cli = new Command('inventor').version(packageJson.version)

await plugin.init(cli)

cli.parse(process.argv)
