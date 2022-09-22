/**
 * 依赖包管理模块
 * @author: sunkeysun
 */
import { type Options } from './cmd.js';
export declare const bin = "pnpm";
export declare function init(options?: Options): Promise<unknown>;
export declare function install(options?: Options): Promise<unknown>;
export declare function addDependencies(packageNames: string[], options?: Options): Promise<unknown>;
export declare function addDevDependencies(packageNames: string[], options?: Options): Promise<unknown>;
export declare function removeDependencies(packageNames: string[], options?: Options): Promise<unknown>;
export declare function removeDevDependencies(packageNames: string[], options?: Options): Promise<unknown>;
