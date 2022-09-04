/**
 * babel 配置
 */
const { NODE_ENV } = process.env

function ifRelease(release, development) {
  return NODE_ENV === 'production' ? release : development
}

module.exports = {
  presets: [
    '@babel/preset-react',
    [
      '@babel/preset-env',
      {
        targets: {
          // detail: https://browserl.ist/?q=%3E+0.1%25%2C+not+ie+%3C%3D+8
          browsers: '> 0.1%, not ie <= 11',
        },
      },
    ],
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
