/**
 * action 入口
 * @author: sunkeysun
 */
import { Action } from '@inventorjs/core'
import webpack, { type Configuration } from 'webpack'
import webpackFactory from '../config/webpackFactory.js'

const CRITICAL_SIZE = 1024 * 200
export default class extends Action {
  description = '构建项目'
  options = []
  async action() {
    const pluginConfig = await this.getPluginConfig()

    const baseConfig = webpackFactory({
      root: this.pwd,
      release: true,
      port: 8080,
    })
    const webpackConfig: Configuration =
      pluginConfig?.webpack?.(baseConfig) ?? baseConfig
    const compiler = webpack(webpackConfig)

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
          this.log.raw(statJson.errors.map((item) => item.message).join('\n'))
          reject(statJson.errors)
          return
        }
        if (statJson.warnings?.length) {
          this.log.error('Compile with warnings.')
          this.log.raw(statJson.warnings.map((item) => item.message).join('\n'))
        }
        this.log.raw(
          statJson.assets?.map((asset) => {
            const humanSize = this.util.humanSize(asset.size)
            const criticalSize = this.util.humanSize(CRITICAL_SIZE)
            return asset.size > CRITICAL_SIZE
              ? [this.color.cyan(asset.name), this.color.red(`${humanSize}[exceed ${criticalSize}]`)]
              : [this.color.cyan(asset.name), this.color.cyan(humanSize)]
          }),
          { boxen: { title: 'Assets' } },
        )
        resolve('')
      })
    })
    await this.loadingTask(buildTask, {
      text: 'webpack building assets...',
      successText: this.color.green('webpack build assets successfully'),
      failText: (err) =>
        `webpack build assets failed(${this.color.red(
          (err as unknown as string[])?.length,
        )} errors)\n`,
    })
  }
}
