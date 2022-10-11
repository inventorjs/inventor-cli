/**
 * react app preset
 * @author: sunkeysun
 */
import merge from 'lodash.merge'

import type { ConfigAPI }  from '@babel/core'

interface Options {
  alias?: Record<string, string>
  env?: Record<string, string> | false
  typescript?: Record<string, string> | false
  react?: Record<string, string> | false
  '@babel/plugin-transform-runtime'?: Record<string, unknown> | false
  '@babel/plugin-proposal-decorators'?: Record<string, unknown> | false
  '@babel/plugin-proposal-export-default-from'?: Record<string, unknown> | false
  '@babel/plugin-proposal-export-namespace-from'?: Record<string, unknown> | false
}

interface PackageNames extends Options {
  'react-refresh/babel': void
}

type Env = 'production' | 'development' | 'test'

const packageMap = {
  env: '@babel/preset-env' as const,
  typescript: '@babel/preset-typescript' as const,
  react: '@babel/preset-react' as const,
} 
type PackageMap = typeof packageMap
type ShortPackageName = keyof PackageMap

export default (api: ConfigAPI, opts: Options = {}, env: Env = 'production') => {
  const isProduction = env === 'production'
  const { alias } = opts

  function ifRequire(pkg: keyof PackageNames | false, options = {}) {
    if (!pkg || opts?.[pkg as keyof Options] === false) return false

    let packageName: Omit<keyof PackageNames, ShortPackageName | 'alias'> | PackageMap[ShortPackageName] = pkg

    if (Object.keys(packageMap).includes(pkg))  {
      packageName = packageMap[pkg as ShortPackageName]
    }

    return [require(packageName as string), merge(options, opts?.[pkg as keyof Options] ?? {})]
  }

  api.cache.using(() => env)

  return {
    presets: [
      ifRequire('env'),
      ifRequire('react', { runtime: 'automatic' }),
      ifRequire('typescript'),
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
