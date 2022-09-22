export interface RenderOptions {
    data?: Record<string, unknown>;
}
export declare function getAllFiles(dirPath: string): Promise<string[]>;
export declare function getExistsTemplateFiles(templateDir: string, destinationDir: string): Promise<string[]>;
export declare function exists(filePath: string): Promise<boolean>;
export declare function renderTemplate(templateDir: string, destinationDir: string, options?: RenderOptions): Promise<void>;
export declare function renderTemplateFile(templateFile: string, destinationFile: string, options?: RenderOptions): Promise<void>;
