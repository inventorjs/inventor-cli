import webpack from 'webpack'
import { mergeWithCustomize, mergeWithRules, unique } from 'webpack-merge'

const a = {
  module: {
    rules: [
      {
        name: '2',
        test: /\.css$/,
        use: [{ loader: 'style-loader' }, { loader: 'sass-loader' }],
      },
    ],
  },
}

const b = {
  module: {
    rules: [
      {
        name: '1',
        test: /\.css$/,
        use: [
          {
            loader: 'style-loader',
            options: {
              modules: true,
            },
          },
        ],
      },
    ],
  },
}

// const result = mergeWithCustomize({
//   customizeArray: unique(
//     "plugins",
//     ["HotModuleReplacementPlugin"],
//     (plugin) => plugin.constructor && plugin.constructor.name
//   ),
// })(
//   {
//     plugins: [new webpack.HotModuleReplacementPlugin()],
//   },
//   {
//     plugins: [new webpack.HotModuleReplacementPlugin()],
//   }
// );

// const result = unique(
//   'plugins',
//   ['HotModuleReplacementPlugin'],
//   (plugin) => plugin.constructor && plugin.constructor.name,
// )(
//    [new webpack.HotModuleReplacementPlugin()],
//    [new webpack.HotModuleReplacementPlugin()],
//   'plugins',
// )

// console.log(result, '---')

// const result = mergeWithCustomize({
//   customizeArray(a, b, key) {
//     // if (key === 'module') {
//       // const result = mergeWithRules({
//       //   rules: {
//       //     test: 'match',
//       //     use: 'replace',
//       //   },
//       // })(a, b)
//       // const result = unique('rules', ['1'], (item) => item.name)(a, b)

//       // console.log(result);
//       // return result
//       console.log(a, b, key)
//     // }
//   },
// })(a, b);

// console.log(JSON.stringify(result, null, 2))
