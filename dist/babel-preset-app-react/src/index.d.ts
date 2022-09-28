import type { ConfigAPI } from '@babel/core';
interface Options {
    alias?: Record<string, string>;
    '@babel/preset-env'?: Record<string, unknown> | false;
    '@babel/preset-react'?: Record<string, unknown> | false;
    '@babel/plugin-proposal-decorators'?: Record<string, unknown> | false;
    '@babel/plugin-proposal-export-default-from'?: Record<string, unknown> | false;
    '@babel/plugin-proposal-export-namespace-from'?: Record<string, unknown> | false;
    '@babel/plugin-transform-runtime'?: Record<string, unknown> | false;
    'react-refresh/babel'?: Record<string, unknown> | false;
}
declare type Env = 'production' | 'development' | 'test';
declare const _default: (api: ConfigAPI, opts?: Options, env?: Env) => {
    presets: (boolean | any[])[];
    plugins: (boolean | any[] | undefined)[];
};
export default _default;
