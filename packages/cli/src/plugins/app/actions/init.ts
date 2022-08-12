/**
 * 插件初始化 action
 * @author: sunkeysun
 */
import { plugin, prompts } from '../../../core/index.js'

export default class Action extends plugin.Action {
  name = 'init'
  description = '初始化创建一个插件项目，可快速开发插件'
  options = [
    { option: '-n --plugin-name [pluginName]', description: '初始化项目名称，自动初始化为 inventor-plugin-[name]' },
  ]

  async action(options: Record<string, string>) {
    console.log(options)
    const answers = await prompts.prompts([
      {
        type: 'text',
        name: 'pluginName',
        message: '请输入插件名称',
        validate: async (pluginName) => {
          if (!false) {
            return '插件名称不合法【只允许字母数字下划线】'
          }
          if (!false) {
            return '插件名称已经被注册，请选择其他名称'
          }
          return true
        },
      },
    ])
    console.log(answers)
  }
}


// export default async function init() {
  // console.log(init)
  // const answers = await prompts.prompts([
  //   {
  //     type: 'text',
  //     name: 'name',
  //     message: '请输入插件名称',
  //     validate: async (name) => {
  //       if (!await plugin.checkIsValid(name)) {
  //         return '插件名称不合法【只允许字母数字下划线】'
  //       }
  //       if (await plugin.checkIsExists(name)) {
  //         return '插件名称已经被注册，请选择其他名称'
  //       }
  //       return true
  //     },
  //   },
  // ])
  // const { name } = answers

  // await mkdir(`${env.cwd()}/inventor-plugin-${name}`)
// }
