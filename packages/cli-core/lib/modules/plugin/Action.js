/**
 * Action 抽象类
 * @author: sunkeysun
 */
import path from 'node:path';
import { oraPromise } from 'ora';
import prompts from 'prompts';
import * as fs from '../fs.js';
import * as env from '../env.js';
import * as log from '../log.js';
import * as git from '../git.js';
import * as pm from '../pm.js';
export default class Action {
    #pluginRoot;
    constructor({ pluginRoot }) {
        this.#pluginRoot = pluginRoot;
    }
    async prompts(questions, options = { onCancel: () => process.exit(1) }) {
        if (!questions || (Array.isArray(questions) && !questions.length)) {
            return {};
        }
        return prompts(questions, options);
    }
    async loading(...args) {
        return oraPromise(...args);
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
    get templatePath() {
        return path.resolve(this.#pluginRoot, '../templates');
    }
    async renderTemplate(templateName, destinationName, templateData = {}) {
        const templateDir = path.resolve(this.templatePath, templateName);
        const destinationDir = path.resolve(this.pwd, destinationName);
        return fs.renderTemplate(templateDir, destinationDir, templateData);
    }
    async renderTemplateFile(templateFile, destinationFile, templateData = {}) {
        return fs.renderTemplateFile(templateFile, destinationFile, templateData);
    }
    filename(...args) {
        return env.filename(...args);
    }
    dirname(...args) {
        return env.dirname(...args);
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
}
