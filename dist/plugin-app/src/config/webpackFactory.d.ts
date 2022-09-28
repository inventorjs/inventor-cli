import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import TerserPlugin from 'terser-webpack-plugin';
import ReactRefreshWebpackPlugin from '@pmmmwh/react-refresh-webpack-plugin';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';
interface FactoryParams {
    root: string;
    release?: boolean;
    analyse?: boolean;
    alias?: Record<string, string> | null;
    port: number;
}
declare const _default: ({ root, release, analyse, alias, port }: FactoryParams) => {
    mode: string;
    stats: string;
    entry: {
        main: string;
    };
    output: {
        filename: string;
        path: string;
        publicPath: string;
        chunkFilename: string;
    };
    module: {
        rules: ({
            test: RegExp;
            use: ({
                loader: string;
                options: {
                    workers: number;
                    cacheDirectory?: undefined;
                };
            } | {
                loader: string;
                options: {
                    cacheDirectory: boolean;
                    workers?: undefined;
                };
            })[];
            exclude: RegExp;
        } | {
            test: RegExp;
            use: (string | {
                loader: string;
                options: {
                    workers: number;
                    modules?: undefined;
                };
            } | {
                loader: string;
                options: {
                    modules: {
                        auto: (resourcePath: string) => boolean;
                    };
                    workers?: undefined;
                };
            })[];
            exclude?: undefined;
        } | {
            test: RegExp;
            use: (string | {
                loader: string;
                options: {
                    lessOptions: {
                        javascriptEnabled: boolean;
                        math: string;
                    };
                };
            })[];
            exclude?: undefined;
        } | {
            test: RegExp;
            use: {
                loader: string;
                options: {
                    limit: number;
                    name: string;
                };
            }[];
            exclude?: undefined;
        })[];
    };
    plugins: (false | HtmlWebpackPlugin | MiniCssExtractPlugin | ReactRefreshWebpackPlugin | BundleAnalyzerPlugin | null)[];
    resolve: {
        extensions: string[];
    };
    optimization: {
        minimize: boolean;
        minimizer: TerserPlugin<import("terser").MinifyOptions>[];
        splitChunks: {
            cacheGroups: {
                defaults: boolean;
                commont: {
                    name: string;
                    minChunks: number;
                    priority: number;
                };
                vendors: {
                    test: RegExp;
                    name: string;
                    chunks: string;
                    priority: number;
                };
            };
        };
    };
    devServer: {
        port: number;
        server: string;
        hot: boolean;
        historyApiFallback: boolean;
        headers: {
            'Access-Control-Allow-Origin': string;
        };
        static: string;
    };
};
export default _default;
