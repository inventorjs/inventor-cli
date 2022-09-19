/**
 * action 入口
 * @author: sunkeysun
 */
import { Action } from '@inventorjs/core'
import webpack, { type Configuration } from 'webpack'
import webpackDevServer from 'webpack-dev-server'
import { mergeWithCustomize, customizeObject, unique } from 'webpack-merge'
import baseWebpackConfig from '../config/webpack.config.base.js'
export default class DevAction extends Action {
  description = '启动开发服务器'
  options = []
  async action() {
    const pluginConfig = await this.getPluginConfig('app', 'local')
    const { type } = pluginConfig

    if (type === 'react-webpack-js') {
      const baseConfig = baseWebpackConfig({ root: this.pwd })
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
      const devServer = new webpackDevServer(webpackConfig.devServer, compiler)
      await devServer.start()
    }
  }
}
