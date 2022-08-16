#!/usr/bin/env node
/**
 * inventor 命令行入口
 * @author: sunkeysun
 */
import { Command } from 'commander'
import { log } from '@inventorjs/cli-core'
import { createRequire } from 'node:module'
import { init } from './plugin.js'

const packageJson = createRequire(import.meta.url)('../package.json')

const cli = new Command('inventor').version(packageJson.version)

log.welcome({ cliName: 'inventor', version: packageJson.version })

await init(cli)

cli.parse(process.argv)
