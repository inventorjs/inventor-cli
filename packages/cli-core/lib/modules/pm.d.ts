export declare const bin = "yarn";
export declare function install({ root }: {
    root: string;
}): Promise<void>;
export declare function addDependencies(): Promise<void>;
export declare function addDevDependencies(): Promise<void>;
export declare function removeDependencies(): Promise<void>;
export declare function removeDevDependencies(): Promise<void>;
