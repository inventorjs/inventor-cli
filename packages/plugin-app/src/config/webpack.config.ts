/**
 * webpack 配置
 * @author: sunkeysun
 */
import path from 'node:path'
import os from 'node:os'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import TerserPlugin from 'terser-webpack-plugin'
import ReactRefreshWebpackPlugin from '@pmmmwh/react-refresh-webpack-plugin'
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer'
import webpack from 'webpack'
import Gauge from 'gauge'

const { NODE_ENV, ANALYSE } = process.env
const progressBar = new Gauge()

function ifRelease(release: unknown, development: unknown) {
  return NODE_ENV === 'production' ? release : development
}

export default ({ root }: { root: string }) => ({
  mode: ifRelease('production', 'development'),
  entry: {
    main: path.resolve(root, 'src/index.jsx'),
  },
  output: {
    filename: `assets/${ifRelease('[name].[contenthash:10].js', '[name].js')}`,
    path: path.resolve(root, 'dist'),
    publicPath: '/', // webpack-dev-server 只支持 /，否则无法找到入口 index.html
    chunkFilename: `assets/chunks/${ifRelease(
      '[name].[contenthash:10].js',
      '[name].js',
    )}`,
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        use: [
          { loader: 'thread-loader', options: { workers: os.cpus().length } },
          'babel-loader',
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [
          { loader: 'thread-loader', options: { workers: os.cpus().length } },
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              modules: {
                auto: (resourcePath: string) =>
                  resourcePath.endsWith('.module.css'),
              },
            },
          },
        ],
      },
      {
        test: /\.less$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          {
            loader: 'less-loader',
            options: {
              lessOptions: {
                javascriptEnabled: true,
                math: 'always',
              },
            },
          },
        ],
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/,
        use: [
          {
            loader: 'url-loader',
            options: {
              limit: 1,
              name: 'resources/[name].[contenthash:10].[ext]?[hash]',
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new webpack.ProgressPlugin({
      handler(percent, message) {
        progressBar.pulse()
        progressBar.show(`[${(percent * 100).toFixed(2)}%] ${message}`, percent)
        if (percent >= 1) {
          progressBar.hide()
        }
      },
    }),
    new MiniCssExtractPlugin({
      filename: ifRelease('[name].[contenthash].css', '[name].css') as string,
      chunkFilename: ifRelease('[id].[contenthash].css', '[id].css') as string,
    }),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: path.resolve(root, 'public/index.html'),
      inject: false,
    }),
    ifRelease(null, new ReactRefreshWebpackPlugin()),
    ANALYSE && new BundleAnalyzerPlugin(),
  ].filter(Boolean),

  resolve: {
    extensions: ['.js', '.jsx', '.json'],
  },

  optimization: {
    minimize: ifRelease(true, false),
    minimizer: [
      new TerserPlugin({
        parallel: true,
        terserOptions: {
          format: {
            comments: false,
          },
        },
        extractComments: false,
      }),
    ],
    splitChunks: {
      cacheGroups: {
        defaults: false,
        commont: {
          name: 'common',
          minChunks: 2,
          priority: -20,
        },
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: -10,
        },
      },
    },
  },

  devServer: {
    port: 'auto',
    server: 'http',
    hot: true,
    historyApiFallback: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    static: {
      directory: path.resolve(root, 'dist'),
    },
  },
})
