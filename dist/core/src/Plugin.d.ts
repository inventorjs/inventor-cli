/**
 * Plugin 抽象类
 * @author: sunkeysun
 */
import type { RenderOptions } from './modules/fs.js';
import type { LoadFrom } from './modules/rc.js';
import inquirer from 'inquirer';
import { oraPromise } from 'ora';
import * as fs from './modules/fs.js';
import * as env from './modules/env.js';
import * as log from './modules/log.js';
import * as git from './modules/git.js';
import * as pm from './modules/pm.js';
import * as cmd from './modules/cmd.js';
import * as rc from './modules/rc.js';
export declare abstract class Plugin {
    #private;
    abstract description: string;
    constructor({ entryPath }: {
        entryPath: string;
    });
    get entryPath(): string;
    get templatePath(): string;
    get actionPath(): string;
    prompt(...args: Parameters<typeof inquirer.prompt>): Promise<import("inquirer").Answers>;
    install(...args: Parameters<typeof pm.install>): Promise<unknown>;
    addDependencies(...args: Parameters<typeof pm.addDependencies>): Promise<unknown>;
    addDevDependencies(...args: Parameters<typeof pm.addDevDependencies>): Promise<unknown>;
    removeDependencies(...args: Parameters<typeof pm.removeDependencies>): Promise<unknown>;
    removeDevDependencies(...args: Parameters<typeof pm.removeDevDependencies>): Promise<unknown>;
    confirmOverwrites(paths: string[]): Promise<any>;
    renderTemplate(templateName: string, destinationName: string, options?: RenderOptions & {
        overwrites?: boolean;
    }): Promise<void>;
    renderTemplateFile(templateName: string, templateFile: string, destinationFile: string, options?: RenderOptions & {
        overwrites?: boolean;
    }): Promise<void>;
    runTask(task: () => Promise<unknown>, { cwd }?: {
        cwd?: string;
    }): Promise<void>;
    loadingTask(...args: Parameters<typeof oraPromise>): Promise<unknown>;
    seriesTask(tasks: Promise<unknown>[]): Promise<unknown[]>;
    exec(...args: Parameters<typeof cmd.exec>): Promise<unknown>;
    installHusky(): Promise<void>;
    addCommitLint(): Promise<void>;
    getPluginConfig(pluginName: string, from?: LoadFrom): Promise<any>;
    filename(...args: Parameters<typeof env.filename>): string;
    dirname(...args: Parameters<typeof env.dirname>): string;
    get color(): import("chalk").ChalkInstance;
    get pwd(): string;
    get homedir(): string;
    get username(): string;
    get log(): typeof log;
    get git(): typeof git;
    get pm(): typeof pm;
    get fs(): typeof fs;
    get cmd(): typeof cmd;
    get rc(): typeof rc;
}
export interface ActionOption {
    option: string;
    description: string;
    default?: unknown;
}
export interface ActionOptions {
    [k: string]: unknown;
}
export declare abstract class Action extends Plugin {
    abstract options: ActionOption[];
    abstract action(options: Record<string, unknown>): Promise<void>;
}
