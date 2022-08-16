export declare function getAllFiles(dirPath: string): Promise<string[]>;
export declare function renderTemplate(templateDir: string, destinationDir: string, templateData: Record<string, unknown>): Promise<void>;
export declare function renderFile(templateFile: string, destinationFile: string, templateData: Record<string, unknown>): Promise<void>;
