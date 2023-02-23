/**
 * action 入口
 * @author: sunkeysun
 */
import { Action } from '@inventorjs/cli-core';
import webpackDevServer from 'webpack-dev-server';
type DevServerConfig = webpackDevServer.Configuration;
interface ServerInfo {
    localAddress: string;
    staticPath: DevServerConfig['static'];
    historyApiFallback: DevServerConfig['historyApiFallback'];
}
export default class DevAction extends Action {
    description: string;
    options: {
        flags: string;
        description: string;
    }[];
    logServerInfo({ localAddress, staticPath, historyApiFallback }: ServerInfo): void;
    run(_: string[], options: Record<string, unknown>): Promise<void>;
}
export {};
