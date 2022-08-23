export declare const bin = "pnpm";
interface InstallOptions {
    cwd: string;
}
export declare function init({ cwd }: InstallOptions): Promise<unknown>;
export declare function install({ cwd }: InstallOptions): Promise<unknown>;
export declare function addDependencies(packageNames: string[], { cwd }: InstallOptions): Promise<unknown>;
export declare function addDevDependencies(packageNames: string[], { cwd }: InstallOptions): Promise<unknown>;
export declare function removeDependencies(packageNames: string[], { cwd }: InstallOptions): Promise<unknown>;
export declare function removeDevDependencies(packageNames: string[], { cwd }: InstallOptions): Promise<unknown>;
export {};
