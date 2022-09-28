/**
 * action 入口
 * @author: sunkeysun
 */
import { Action } from '@inventorjs/core';
import webpack from 'webpack';
import webpackFactory from '../config/webpackFactory.js';
export default class BuildAction extends Action {
    description = '构建项目';
    options = [];
    async action() {
        const pluginConfig = await this.getPluginConfig(import.meta.url);
        const { type } = pluginConfig;
        if (type === 'react-webpack-js') {
            const baseConfig = webpackFactory({
                root: this.pwd,
                release: true,
                port: 8080,
            });
            const webpackConfig = pluginConfig?.webpack?.(baseConfig) ?? baseConfig;
            const compiler = webpack(webpackConfig);
            const buildTask = new Promise((resolve, reject) => {
                compiler.run((err, stats) => {
                    if (err) {
                        reject(err.message);
                        return;
                    }
                    this.log.clear();
                    const statJson = stats?.toJson?.({
                        all: false,
                        warnings: true,
                        errors: true,
                    }) ?? {};
                    if (statJson.errors?.length) {
                        this.log.raw(statJson.errors.map((item) => item.message).join('\n'));
                        reject(statJson.errors);
                        return;
                    }
                    if (statJson.warnings?.length) {
                        this.log.error('Compile with warnings.');
                        this.log.raw(statJson.warnings.map((item) => item.message).join('\n'));
                    }
                    resolve('');
                });
            });
            await this.loadingTask(buildTask, {
                text: 'webpack building assets...',
                successText: this.color.green('webpack build assets successfully'),
                failText: (err) => `webpack build assets failed(${this.color.red(err?.length)} errors)\n`,
            });
        }
    }
}
