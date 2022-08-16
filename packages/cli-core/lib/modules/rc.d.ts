export declare const filename = ".inventorrc.toml";
export declare function getLocal(key?: string): Promise<unknown>;
export declare function setLocal(key: string, data: unknown): Promise<void>;
export declare function getGlobal(key?: string): Promise<any>;
export declare function setGlobal(key: string, data: unknown): Promise<void>;
