/// <reference types="node" resolution-mode="require"/>
/**
 * 命令执行模块
 * @author: sunkeysun
 */
import { type Options as ExecaOptions } from 'execa';
export interface Output {
    status?: 'data' | 'error';
    output?: Buffer | string;
}
declare type SupportedExecaOptions = 'cwd' | 'timeout' | 'env' | 'stdio';
export interface Options extends Pick<ExecaOptions, SupportedExecaOptions> {
    pipeline?: 'stdout' | 'stderr';
    pipe?: (buf: Buffer) => Output;
}
export declare function exec(bin: string, args: string[], options?: Options): Promise<unknown>;
export {};
