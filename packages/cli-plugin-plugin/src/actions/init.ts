/**
 * 插件初始化 action
 * @author: sunkeysun
 */
import path from 'node:path'
import chalk from 'chalk'
import { plugin, log } from '@inventorjs/cli-core'

interface Options {
  name?: string
}
export default class Action extends plugin.Action {
  description = '初始化创建一个插件项目，可快速开发插件'
  options = []

  #validateName(name: string) {
    if (!name) {
      return '插件名称不能为空'
    }

    if (!/^\w+$/.test(name)) {
      return '插件名称不合法【只允许字母数字下划线】'
    }
    return true
  }

  #getPackageName(name: string) {
    return `inventor-plugin-${name}`
  }

  async action(options: Options) {
    if (options.name && !this.#validateName(options.name)) {
      return
    }

    const answers = await this.prompts([
      {
        type: 'text',
        name: 'name',
        message: '请输入插件名称，项目目录将自动初始化为"inventor-plugin-[name]"',
        validate: (name) => {
          if (!name) {
            return '插件名称不能为空'
          }
        
          if (!/^\w+$/.test(name)) {
            return '插件名称不合法【只允许字母数字下划线】'
          }
          return true
        }
      },
      {
        type: 'text',
        name: 'description',
        message: '请输入插件描述，用于说明插件功能',
        validate: (description) => !description ? '插件描述不能为空' : true
      },
      {
        type: 'text',
        name: 'author',
        message: '请输入插件作者名称',
        initial: this.username(),
        validate: (author) => !author ? '作者名称不能为空' : true
      },
      {
        type: 'confirm',
        name: 'isConfirm',
        message: (prev) => `即将创建插件项目"${this.#getPackageName(prev)}"是否继续`,
        initial: true,
      },
    ])

    const { name, description, author } = answers
    const packageName = this.#getPackageName(name as string)
    const templateName = 'default'
    await this.loading(
      this.renderTemplate(templateName, packageName, { packageName, description, author }),
      '正在初始化项目目录...',
    )
    log.info('开始安装依赖...')
    await this.install({ root: path.resolve(this.pwd(), packageName) })

    log.success(
`
  ${chalk.cyan('Done. Now run:')}

    cd ${packageName}
    yarn dev

  ${chalk.cyan('To finish init.')}
`   )
  }
}
