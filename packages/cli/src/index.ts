/**
 * inventor 命令行入口
 * @author: sunkeysun
 */
import { Command } from 'commander'
import { plugin, log } from './core/index.js'
import { createRequire } from 'node:module'

const packageJson = createRequire(import.meta.url)('../package.json')

const cli = new Command('inventor').version(packageJson.version)

log.welcome({ cliName: 'inventor', version: packageJson.version })

await plugin.init(cli)

cli.parse(process.argv)
