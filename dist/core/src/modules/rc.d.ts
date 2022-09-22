export declare type LoadFrom = 'local' | 'global';
export declare function search(dirname?: string): Promise<{
    config?: Record<string, unknown>;
}>;
export declare function load(from?: LoadFrom): Promise<Record<string, unknown> | null>;
