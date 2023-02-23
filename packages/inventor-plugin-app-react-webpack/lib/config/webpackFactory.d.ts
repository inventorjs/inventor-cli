import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import TerserPlugin from 'terser-webpack-plugin';
import ReactRefreshWebpackPlugin from '@pmmmwh/react-refresh-webpack-plugin';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';
interface FactoryParams {
    root: string;
    release?: boolean;
    analyse?: boolean;
    port?: number;
    assets?: string;
}
declare const _default: ({ root, release, analyse, port, assets }: FactoryParams) => {
    mode: string;
    devtool: string | undefined;
    stats: string;
    entry: {
        main: string;
    };
    output: {
        clean: boolean;
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
                    modules: {
                        auto: (resourcePath: string) => boolean;
                    };
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
                defaultVendors: boolean;
                common: {
                    name: string;
                    minChunks: number;
                    priority: number;
                    reuseExistingChunk: boolean;
                };
                vendors: {
                    test: RegExp;
                    name: string;
                    chunks: string;
                    priority: number;
                    reuseExistingChunk: boolean;
                };
            };
        };
    };
    devServer: {
        port: number | undefined;
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
