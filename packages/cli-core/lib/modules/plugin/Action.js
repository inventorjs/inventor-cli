/**
 * Action 抽象类
 * @author: sunkeysun
 */
import path from 'node:path';
import { oraPromise } from 'ora';
import { prompts } from '../prompts.js';
import { renderTemplate, renderTemplateFile } from '../fs.js';
import { pwd, homedir, filename, dirname, username } from '../env.js';
import { install } from '../pm.js';
export default class Action {
    #root;
    constructor({ root }) {
        this.#root = root;
    }
    async prompts(questions) {
        if (!questions || (Array.isArray(questions) && !questions.length)) {
            return {};
        }
        return prompts(questions);
    }
    async loading(...args) {
        return oraPromise.apply(null, args);
    }
    async install({ root }) {
        await install({ root });
    }
    async addDependencies(packageNames, options) { }
    async addDevDependencies(packageNames, options) { }
    async removeDependencies(packageNames, options) { }
    async removeDevDependencies(packageNames, options) { }
    get templatePath() {
        return path.resolve(this.#root, '../templates');
    }
    async renderTemplate(templateName, destinationName, templateData = {}) {
        const templateDir = path.resolve(this.templatePath, templateName);
        const destinationDir = path.resolve(pwd(), destinationName);
        await renderTemplate(templateDir, destinationDir, templateData);
    }
    async renderTemplateFile(templateFile, destinationFile, templateData = {}) {
        await renderTemplateFile(templateFile, destinationFile, templateData);
    }
    pwd() { return pwd(); }
    homedir() { return homedir(); }
    filename(metaUrl) { return filename(metaUrl); }
    dirname(metaUrl) { return dirname(metaUrl); }
    username() { return username(); }
}
