/**
 * action 入口
 * @author: sunkeysun
 */
 import { Action } from '@inventorjs/core'
 import webpack, { type Configuration } from 'webpack'
 import { mergeWithCustomize, customizeObject, unique } from 'webpack-merge'
 import baseWebpackConfig from '../config/webpack.config.base.js'
 export default class BuildAction extends Action {
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
 
       compiler.run((err, stats) => {
         if (err) {
           this.log.error(err.message)
         }
         if (stats?.hasErrors) {
           const info = stats.toJson()
           this.log.error(
             info.errors?.map((err) => err.message).join('\n') ?? '',
           )
           return
         }
         compiler.close((err) => {
           if (err) {
             this.log.error(err.message)
             return 
           }
           this.log.success('building success!')
         })
       })
     }
   }
 }
