/**
 * webpack 配置
 * @author: sunkeysun
 */
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import TerserPlugin from 'terser-webpack-plugin';
import ReactRefreshWebpackPlugin from '@pmmmwh/react-refresh-webpack-plugin';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';
const require = createRequire(import.meta.url);
export default ({ root, release = false, analyse = false, alias = null, port }) => {
    function ifRelease(releaseValue, developmentValue) {
        return release ? releaseValue : developmentValue;
    }
    return {
        mode: ifRelease('production', 'development'),
        stats: 'errors-warnings',
        entry: {
            main: path.resolve(root, 'src/index.jsx'),
        },
        output: {
            filename: `assets/${ifRelease('[name].[contenthash:10].js', '[name].js')}`,
            path: path.resolve(root, 'dist'),
            publicPath: '/',
            chunkFilename: `assets/chunks/${ifRelease('[name].[contenthash:10].js', '[name].js')}`,
        },
        module: {
            rules: [
                {
                    test: /\.jsx?$/,
                    use: [
                        {
                            loader: require.resolve('thread-loader'),
                            options: { workers: os.cpus().length },
                        },
                        {
                            loader: require.resolve('babel-loader'),
                            options: {
                                presets: [
                                    ['@babel/preset-react', { runtime: 'automatic' }],
                                    ['@babel/preset-env'],
                                ],
                                plugins: [
                                    [
                                        require.resolve('@babel/plugin-proposal-decorators'),
                                        { legacy: true },
                                    ],
                                    require.resolve('@babel/plugin-proposal-export-default-from'),
                                    require.resolve('@babel/plugin-proposal-export-namespace-from'),
                                    [
                                        require.resolve('@babel/plugin-transform-runtime'),
                                        { regenerator: true },
                                    ],
                                    ifRelease(null, require.resolve('react-refresh/babel')),
                                    alias && [require.resolve('babel-plugin-module-resolver'), { alias }],
                                ].filter(Boolean),
                                cacheDirectory: true,
                            },
                        },
                    ],
                    exclude: /node_modules/,
                },
                {
                    test: /\.css$/,
                    use: [
                        {
                            loader: require.resolve('thread-loader'),
                            options: { workers: os.cpus().length },
                        },
                        MiniCssExtractPlugin.loader,
                        {
                            loader: require.resolve('css-loader'),
                            options: {
                                modules: {
                                    auto: (resourcePath) => resourcePath.endsWith('.module.css'),
                                },
                            },
                        },
                    ],
                },
                {
                    test: /\.less$/,
                    use: [
                        MiniCssExtractPlugin.loader,
                        require.resolve('css-loader'),
                        {
                            loader: require.resolve('less-loader'),
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
                            loader: require.resolve('url-loader'),
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
            new MiniCssExtractPlugin({
                filename: ifRelease('[name].[contenthash].css', '[name].css'),
                chunkFilename: ifRelease('[id].[contenthash].css', '[id].css'),
            }),
            new HtmlWebpackPlugin({
                filename: 'index.html',
                template: path.resolve(root, 'public/index.html'),
            }),
            ifRelease(null, new ReactRefreshWebpackPlugin()),
            analyse && new BundleAnalyzerPlugin(),
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
            port,
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
    };
};
