/**
 * action 入口
 * @author: sunkeysun
 */
import { Action } from '@inventorjs/core'
import webpack, { type Configuration } from 'webpack'
import detectPort from 'detect-port'
import webpackDevServer from 'webpack-dev-server'
import webpackFactory from '../config/webpackFactory.js'

type DevServerConfig = webpackDevServer.Configuration
interface ServerInfo {
  localAddress: string
  staticPath: DevServerConfig['static']
  historyApiFallback: DevServerConfig['historyApiFallback']
}

const PORT = 1990
export default class extends Action {
  description = '启动开发服务器'
  options = []

  logServerInfo({ localAddress, staticPath, historyApiFallback }: ServerInfo) {
    this.log.clear()
    this.log.raw(
      [
        ['LocalAddress:', this.color.cyan(localAddress)],
        ['StaticPath:', this.color.cyan(staticPath)],
        ['HistoryApiFallback:', this.color.cyan(historyApiFallback)],
      ],
      { boxen: { title: 'DevServer' } },
    )
  }

  async action() {
    const pluginConfig = await this.getPluginConfig()
    const devServerPort = await detectPort(PORT)
    const baseConfig = webpackFactory({
      root: this.pwd,
      release: false,
      devServerPort,
    })
    const webpackConfig: Configuration =
      pluginConfig?.webpack?.(baseConfig) ?? baseConfig
    const devServerConfig = webpackConfig.devServer ?? {}
    const { static: staticPath = '', historyApiFallback = false } =
      devServerConfig

    const compiler = webpack(webpackConfig)
    compiler.hooks.done.tap('done', (stats) => {
      const statJson = stats.toJson({
        all: false,
        warnings: true,
        errors: true,
      })
      if (statJson.errors?.length) {
        this.log.error('Compile failed.')
        return
      }
      if (statJson.warnings?.length) {
        this.log.error('Compile with warnings.')
      }
    })
    compiler.hooks.invalid.tap('invalid', (modulePath) => {
      this.logServerInfo({ localAddress, staticPath, historyApiFallback })
      this.log.info(`Compiling...[${this.color.yellow(modulePath)}]`)
    })

    const devServer = new webpackDevServer({ ...devServerConfig }, compiler)
    const localAddress = `${devServerConfig?.server}://localhost:${port}`
    await devServer.startCallback(() =>
      this.logServerInfo({ localAddress, staticPath, historyApiFallback }),
    )
  }
}
