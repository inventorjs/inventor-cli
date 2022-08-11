/**
 * 插件管理插件
 * @author: sunkeysun
 */
import { mkdir } from 'fs/promises'
import { prompts, plugin, env } from '../../core/index.js'

class PluginPlugin extends plugin.Plugin {
  async actionInit() {
    const answers = await prompts.prompts([
      {
        type: 'text',
        name: 'name',
        message: '请输入插件名称',
        validate: async (pluginName) => {
          if (!await this.checkIsValid(pluginName)) {
            return '插件名称不合法【只允许字母数字下划线】'
          }
          if (await this.checkIsExists(pluginName)) {
            return '插件名称已经被注册，请选择其他名称'
          }
          return true
        },
      },
    ])
    const { name } = answers

    await mkdir(`${env.cwd()}/inventor-plugin-${name}`)
  }

  async actionRegister() {
    const answers = await prompts.prompts([
      {
        type: 'text',
        name: 'name',
        message: '请输入注册插件名称[用于调用插件的命令]',
        validate: async (pluginName) => {
          if (!await this.checkIsValid(pluginName)) {
            return '插件名称不合法[只允许字母数字下划线]'
          }
          if (await this.checkIsExists(pluginName)) {
            return '插件名称已经被注册，请选择其他名称'
          }
          return true
        },
      },
      {
        type: 'text',
        name: 'package',
        message: '请输入插件 npm 包名称[或插件入口文件全路径]',
      },
    ])

    console.log(answers)
  }

  async define() {
    return {
      name: 'plugin',
      description: '用于实现 inventor 插件相关功能',
      actions: [
        {
          name: 'init',
          description: '初始化创建一个插件项目，可快速开发插件',
          options: [
            { option: '-n --name [name]', description: '初始化项目名称，自动初始化为 inventor-plugin-[name]' },
          ],
        },
        {
          name: 'register',
          description: '注册插件到 inventor 脚手架，实现全局调用',
          options: [
            { option: '-n --name [name]', description: '注册插件名称，作为插件调用命令' },
            { option: '-p --package [package]', description: '插件对应的 npm 包名称或路径' },
          ],
        },
      ],
    } 
  } 
}

export default PluginPlugin
