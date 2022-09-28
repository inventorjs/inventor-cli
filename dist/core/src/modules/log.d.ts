/**
 * 日志打印模块
 * @author: sunkeysun
 */
import type { Options as BoxenOptions } from 'boxen';
interface Options {
    boxen: BoxenOptions | true;
}
export declare const color: import("chalk").ChalkInstance;
export declare function bye(msg: unknown, options?: Options): void;
export declare function info(msg: unknown, options?: Options): void;
export declare function success(msg: unknown, options?: Options): void;
export declare function error(msg: unknown, options?: Options): void;
export declare function clear(): void;
export declare function raw(msg: unknown, options?: Options): void;
export {};
