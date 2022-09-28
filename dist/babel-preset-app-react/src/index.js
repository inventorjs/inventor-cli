/**
 * react app preset
 * @author: sunkeysun
 */
import merge from 'lodash.merge';
export default (api, opts = {}, env = 'production') => {
    const isProduction = env === 'production';
    const { alias } = opts;
    function ifRequire(pkg, options = {}) {
        if (pkg && opts[pkg] !== false) {
            return [require(pkg), merge(options, opts?.[pkg] ?? {})];
        }
        return false;
    }
    api.cache.using(() => env);
    return {
        presets: [
            ifRequire('@babel/preset-env'),
            ifRequire('@babel/preset-react', { runtime: 'automatic' }),
        ],
        plugins: [
            ifRequire('@babel/plugin-proposal-decorators', { legacy: true }),
            ifRequire('@babel/plugin-proposal-export-default-from'),
            ifRequire('@babel/plugin-proposal-export-namespace-from'),
            ifRequire('@babel/plugin-transform-runtime', { regenerator: true }),
            ifRequire(isProduction && 'react-refresh/babel'),
            alias && [require('babel-plugin-module-resolver'), { alias }],
        ].filter(Boolean),
    };
};
