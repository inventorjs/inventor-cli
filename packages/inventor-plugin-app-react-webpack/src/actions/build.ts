/**
 * action 入口
 * @author: sunkeysun
 */
import { Action } from '@inventorjs/cli-core'
import webpack, { type Configuration } from 'webpack'
import webpackFactory from '../config/webpackFactory.js'

const CRITICAL_SIZE = 1024 * 244
export default class BuildAction extends Action {
  description = '构建项目'
  options = [
    {
      flags: '-a, --analyse',
      description: '开启打包分析',
      defaultValue: false,
    },
  ]

  async run(_params: string[], options: Record<string, unknown>) {
    const { analyse } = options as { analyse: boolean }
    const pluginConfig = await this.getPluginConfig()
    const baseConfig = webpackFactory({
      root: this.pwd,
      release: true,
      analyse,
    })
    const webpackConfig: Configuration =
      pluginConfig?.webpack?.(baseConfig, webpack) ?? baseConfig
    const compiler = webpack(webpackConfig)
    const startTime = Date.now()

    const buildTask = new Promise((resolve, reject) => {
      compiler.run((err, stats) => {
        if (err) {
          reject(err.message)
          return
        }
        this.log.clear()
        const statJson =
          stats?.toJson?.({
            warnings: true,
            errors: true,
            modules: false,
            chunks: false,
            children: false,
          }) ?? {}

        if (statJson.errors?.length) {
          this.log.error('Compile with errors:')
          this.log.error(statJson.errors.map((item) => item.message).join('\n'))
          reject(statJson.errors)
          return
        }
        if (statJson.warnings?.length) {
          this.log.warn('Compile with warnings:')
          this.log.raw(
            this.color.yellow(
              statJson.warnings
                .filter((item) => !item.message.includes('size limit:'))
                .map((item) => item.message)
                .join('\n'),
            ),
          )
        }
        this.log.raw(
          statJson.assets?.map((asset) => {
            const humanSize = this.util.humanSize(asset.size)
            const humanCritical = this.util.humanSize(CRITICAL_SIZE)
            return asset.size > CRITICAL_SIZE
              ? [
                  this.color.red(asset.name),
                  this.color.red(`${humanSize}[exceeds ${humanCritical}]`),
                ]
              : [this.color.cyan(asset.name), this.color.cyan(humanSize)]
          }),
          { boxen: { title: 'Assets' } },
        )
        resolve(Date.now() - startTime)
      })
    })
    await this.loadingTask(buildTask, {
      text: 'webpack building assets...',
      successText: (timeCost) =>
        this.color.green(
          `webpack build assets successfully[timeCost: ${this.color.yellow(
            `${timeCost}ms`,
          )}]`,
        ),
      failText: (err) =>
        `webpack build assets failed(${this.color.red(
          (err as unknown as string[])?.length,
        )} errors)\n`,
    })
  }
}
