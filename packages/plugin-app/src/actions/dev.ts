/**
 * action 入口
 * @author: sunkeysun
 */
import { Action } from '@inventorjs/core'
import path from 'node:path'
import { mergeWithCustomize, customizeObject, unique } from 'webpack-merge'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import webpackConfig from '../config/webpack.config.js'

export default class InitAction extends Action {
  description = '启动开发服务器'
  options = []
  async action() {
    const pluginConfig = await this.getPluginConfig('app', 'local')
    const { type } = pluginConfig

    if (type === 'react-webpack') {
      const baseConfig = webpackConfig({ root: this.pwd })
      const extConfig = {
        entry: {
          index: path.resolve(this.pwd, 'index.jsx'),
        },
        plugins: [
          new HtmlWebpackPlugin({
            filename: 'index.html',
            template: path.resolve(this.pwd, 'public/index.html'),
            inject: false,
          }),
        ],
      }
      console.log(
        mergeWithCustomize({
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
        })(baseConfig, extConfig),
      )
    }
  }
}
