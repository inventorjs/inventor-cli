/**
 * react app preset
 * @author: sunkeysun
 */
import merge from 'lodash.merge'

import type { ConfigAPI }  from '@babel/core'

interface Options {
  alias?: Record<string, string>
  '@babel/preset-env'?: Record<string, unknown> | false
  '@babel/preset-react'?: Record<string, unknown> | false
  '@babel/plugin-proposal-decorators'?: Record<string, unknown> | false
  '@babel/plugin-proposal-export-default-from'?: Record<string, unknown> | false
  '@babel/plugin-proposal-export-namespace-from'?: Record<string, unknown> | false
  '@babel/plugin-transform-runtime'?: Record<string, unknown> | false
  'react-refresh/babel'?: Record<string, unknown> | false
}

type Env = 'production' | 'development' | 'test'

export default (api: ConfigAPI, opts: Options = {}, env: Env = 'production') => {
  const isProduction = env === 'production'
  const { alias } = opts

  function ifRequire(pkg: keyof Options | false, options = {}) {
    if (pkg && opts[pkg] !== false) {
      return [require(pkg), merge(options, opts?.[pkg] ?? {})]
    }
    return false
  }

  api.cache.using(() => env)

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
  }
}
