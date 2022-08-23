import { oraPromise } from 'ora';
import prompts from 'prompts';
import * as fs from '../fs.js';
import * as env from '../env.js';
import * as log from '../log.js';
import * as git from '../git.js';
import * as pm from '../pm.js';
export interface ActionOption {
    option: string;
    description: string;
    default?: unknown;
}
export interface ActionConstructParams {
    pluginRoot: string;
}
export declare type PromptsParameter = Parameters<typeof prompts>[0];
export declare type PromptsOptions = Parameters<typeof prompts>[1];
export default abstract class Action {
    #private;
    abstract description: string;
    abstract options?: ActionOption[];
    abstract action(options: Record<string, unknown>): Promise<void>;
    constructor({ pluginRoot }: ActionConstructParams);
    prompts(questions: PromptsParameter, options?: PromptsOptions): Promise<prompts.Answers<string>>;
    loading(...args: Parameters<typeof oraPromise>): Promise<unknown>;
    install(...args: Parameters<typeof pm.install>): Promise<unknown>;
    addDependencies(...args: Parameters<typeof pm.addDependencies>): Promise<unknown>;
    addDevDependencies(...args: Parameters<typeof pm.addDevDependencies>): Promise<unknown>;
    removeDependencies(...args: Parameters<typeof pm.removeDependencies>): Promise<unknown>;
    removeDevDependencies(...args: Parameters<typeof pm.removeDevDependencies>): Promise<unknown>;
    get templatePath(): string;
    renderTemplate(templateName: string, destinationName: string, templateData?: Record<string, unknown>): Promise<void>;
    renderTemplateFile(templateFile: string, destinationFile: string, templateData?: Record<string, unknown>): Promise<void>;
    filename(...args: Parameters<typeof env.filename>): string;
    dirname(...args: Parameters<typeof env.dirname>): string;
    get pwd(): string;
    get homedir(): string;
    get username(): string;
    get log(): typeof log;
    get git(): typeof git;
    get pm(): typeof pm;
    get fs(): typeof fs;
}
