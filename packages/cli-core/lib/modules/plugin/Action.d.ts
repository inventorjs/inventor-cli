/// <reference types="prompts" />
import { oraPromise } from 'ora';
import { prompts } from '../prompts.js';
export interface ActionOption {
    option: string;
    description: string;
    default?: unknown;
}
export interface ActionConstructParams {
    root: string;
}
export declare type PromptsParameter = Parameters<typeof prompts>[0];
export interface InstallOptions {
    root: string;
}
export interface InstallPackageOptions extends InstallOptions {
    global?: boolean;
}
export default abstract class Action {
    #private;
    abstract name: string;
    abstract description: string;
    abstract options?: ActionOption[];
    abstract action(options: Record<string, unknown>): Promise<void>;
    constructor({ root }: ActionConstructParams);
    prompts(questions: PromptsParameter): Promise<prompts.Answers<string>>;
    loading(...args: Parameters<typeof oraPromise>): Promise<unknown>;
    install({ root }: {
        root: string;
    }): Promise<void>;
    addDependencies(packageNames: string[], options: InstallPackageOptions): Promise<void>;
    addDevDependencies(packageNames: string[], options: InstallPackageOptions): Promise<void>;
    removeDependencies(packageNames: string[], options: InstallPackageOptions): Promise<void>;
    removeDevDependencies(packageNames: string[], options: InstallPackageOptions): Promise<void>;
    get templatePath(): string;
    renderTemplate(templateName: string, destinationName: string, templateData?: Record<string, unknown>): Promise<void>;
    renderTemplateFile(templateFile: string, destinationFile: string, templateData?: Record<string, unknown>): Promise<void>;
    pwd(): string;
    homedir(): string;
    filename(metaUrl: string): string;
    dirname(metaUrl: string): string;
    username(): string;
}
