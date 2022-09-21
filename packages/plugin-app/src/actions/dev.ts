/**
 * action 入口
 * @author: sunkeysun
 */
import { Action } from '@inventorjs/core'
import webpack, { type Configuration } from 'webpack'
import webpackDevServer from 'webpack-dev-server'
import { mergeWithCustomize, customizeObject, unique } from 'webpack-merge'
import webpackFactory from '../config/webpackFactory.js'
export default class DevAction extends Action {
  description = '启动开发服务器'
  options = []
  async action() {
    const pluginConfig = await this.getPluginConfig('app')
    const { type } = pluginConfig

    if (type === 'react-webpack-js') {
      const baseConfig = webpackFactory({ root: this.pwd })
      const customConfig = pluginConfig?.webpack ?? {}
      const webpackConfig: Configuration = mergeWithCustomize({
        customizeObject: customizeObject({
          entry: 'replace',
          output: 'merge',
        }),
        customizeArray: unique(
          'plugins',
          [
            'HtmlWebpackPlugin',
            'ProgressPlugin',
            'MiniCssExtractPlugin',
            'ReactRefreshWebpackPlugin',
            'BundleAnalyzerPlugin',
          ],
          (plugin) => plugin.constructor.name,
        ),
      })(baseConfig, customConfig)

      const compiler = webpack(webpackConfig)
      compiler.hooks.done.tap('done', (stats) => {
        // this.log.clear()
        // const statJson = stats.toJson({
        //   all: false,
        //   warnings: true,
        //   errors: true,
        // })
      })

      const devServer = new webpackDevServer(webpackConfig.devServer, compiler)
      await devServer.startCallback(() => {
        // this.log.clear()
        this.log.info('Starting development server...')
      })
    }
  }
}
