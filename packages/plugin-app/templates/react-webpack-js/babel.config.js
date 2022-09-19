/**
 * babel 配置
 */
const { NODE_ENV } = process.env

function ifRelease(release, development) {
  return NODE_ENV === 'production' ? release : development
}

module.exports = {
  presets: [
    ['@babel/preset-react', { runtime: 'automatic' }],
    ['@babel/preset-env'],
  ],
  plugins: [
    ['@babel/plugin-proposal-decorators', { legacy: true }],
    ['@babel/plugin-proposal-export-default-from'],
    ['@babel/plugin-proposal-export-namespace-from'],
    ['@babel/plugin-transform-runtime', { regenerator: true }],
    ifRelease(null, 'react-refresh/babel'),
    ['module-resolver'],
  ].filter(Boolean),
}
