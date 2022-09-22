import path from 'node:path';
import inquirer from 'inquirer';
import { oraPromise } from 'ora';
import * as fs from './modules/fs.js';
import * as env from './modules/env.js';
import * as log from './modules/log.js';
import * as git from './modules/git.js';
import * as pm from './modules/pm.js';
import * as cmd from './modules/cmd.js';
import * as rc from './modules/rc.js';
export class Plugin {
    #entryPath;
    #templatePath;
    #actionPath;
    constructor({ entryPath }) {
        this.#entryPath = entryPath;
        this.#templatePath = path.resolve(entryPath, '../../templates');
        this.#actionPath = path.resolve(entryPath, '../actions');
    }
    get entryPath() {
        return this.#entryPath;
    }
    get templatePath() {
        return this.#templatePath;
    }
    get actionPath() {
        return this.#actionPath;
    }
    async prompt(...args) {
        return inquirer.prompt(...args);
    }
    async install(...args) {
        return pm.install(...args);
    }
    async addDependencies(...args) {
        return pm.addDependencies(...args);
    }
    async addDevDependencies(...args) {
        return pm.addDevDependencies(...args);
    }
    async removeDependencies(...args) {
        return pm.removeDependencies(...args);
    }
    async removeDevDependencies(...args) {
        return pm.removeDevDependencies(...args);
    }
    async confirmOverwrites(paths) {
        const anwsers = await this.prompt([
            {
                type: 'confirm',
                name: 'isConfirm',
                message: () => `以下文件已经存在:\n${paths
                    .map((path) => this.color.red(`  ${path}`))
                    .join('\n')}\n是否进行覆盖`,
                default: true,
            },
        ]);
        const { isConfirm } = anwsers;
        return isConfirm;
    }
    async renderTemplate(templateName, destinationName, options = {}) {
        const { overwrites = false, ...fsOptions } = options;
        const templateDir = path.resolve(this.#templatePath, templateName);
        const destinationDir = path.resolve(this.pwd, destinationName);
        if (!overwrites) {
            const existsFiles = await fs.getExistsTemplateFiles(templateDir, destinationDir);
            if (existsFiles.length > 0) {
                const isOverwrites = await this.confirmOverwrites(existsFiles);
                if (!isOverwrites) {
                    throw new Error('Overwrites canceled!');
                }
            }
        }
        await fs.renderTemplate(templateDir, destinationDir, fsOptions);
    }
    async renderTemplateFile(templateName, templateFile, destinationFile, options = {}) {
        const { overwrites = false, ...fsOptions } = options;
        const templateFilePath = path.resolve(this.#templatePath, templateName, templateFile);
        const destinationFilePath = path.resolve(this.pwd, destinationFile);
        if (!overwrites) {
            if (await fs.exists(destinationFile)) {
                const isOverwrites = await this.confirmOverwrites([destinationFile]);
                if (!isOverwrites) {
                    throw new Error('Overwrites canceled!');
                }
            }
        }
        await fs.renderTemplateFile(templateFilePath, destinationFilePath, fsOptions);
    }
    async runTask(task, { cwd = env.cwd } = {}) {
        const oldCwd = env.cwd;
        env.changeCwd(cwd ?? env.cwd);
        try {
            await task();
            env.changeCwd(oldCwd);
        }
        catch (err) {
            env.changeCwd(oldCwd);
            throw err;
        }
    }
    async loadingTask(...args) {
        const message = args[1];
        if (typeof message === 'string' && !message.includes('...')) {
            args.splice(1, 1, `${message}...`);
            return oraPromise(...args);
        }
        else if (typeof message === 'object') {
            return oraPromise(...args).catch(() => null);
        }
    }
    async seriesTask(tasks) {
        const results = [];
        for (const task of tasks) {
            const result = await task;
            results.push(result);
        }
        return results;
    }
    async exec(...args) {
        return this.cmd.exec(...args);
    }
    async installHusky() {
        await this.addDevDependencies(['husky']);
        await this.exec(this.pm.bin, ['husky', 'install']);
    }
    async addCommitLint() {
        await this.addDevDependencies([
            '@commitlint/cli',
            '@commitlint/config-conventional',
        ]);
        await this.exec(this.pm.bin, [
            'husky',
            'add',
            'commit-msg',
            `${this.pm.bin} commitlint --edit $1`,
        ]);
    }
    async getPluginConfig(pluginName, from = 'local') {
        const rcConfig = await rc.load(from);
        const plugins = rcConfig?.plugins ?? [];
        const pluginItem = plugins.find((plugin) => {
            if ((Array.isArray(plugin) && plugin[0] === pluginName) ||
                (typeof plugin === 'string' && plugin === pluginName)) {
                return true;
            }
            return false;
        });
        if (pluginItem && Array.isArray(pluginItem)) {
            return pluginItem[1] ?? {};
        }
        return {};
    }
    filename(...args) {
        return env.filename(...args);
    }
    dirname(...args) {
        return env.dirname(...args);
    }
    get color() {
        return this.log.color;
    }
    get pwd() {
        return env.pwd();
    }
    get homedir() {
        return env.homedir();
    }
    get username() {
        return env.username();
    }
    get log() {
        return log;
    }
    get git() {
        return git;
    }
    get pm() {
        return pm;
    }
    get fs() {
        return fs;
    }
    get cmd() {
        return cmd;
    }
    get rc() {
        return rc;
    }
}
export class Action extends Plugin {
}
