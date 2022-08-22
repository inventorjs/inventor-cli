export declare const bin = "pnpm";
export declare function init({ root }: {
    root: string;
}): Promise<void>;
export declare function install({ root }: {
    root: string;
}): Promise<void>;
export declare function addDependencies(): Promise<void>;
export declare function addDevDependencies(): Promise<void>;
export declare function removeDependencies(): Promise<void>;
export declare function removeDevDependencies(): Promise<void>;
