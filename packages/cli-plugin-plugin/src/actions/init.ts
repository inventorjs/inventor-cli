/**
 * 插件初始化 action
 * @author: sunkeysun
 */
import path from 'node:path'
import { Action, log, env } from '@inventorjs/cli-core'

export default class InitAction extends Action {
  description = '初始化创建一个插件项目，可快速开发插件'
  options = []

  #getPackageName(name: string) {
    return `inventor-plugin-${name}`
  }

  async action() {
    const answers = await this.prompts([
      {
        type: 'text',
        name: 'name',
        message:
          '请输入插件名称，项目目录将自动初始化为"inventor-plugin-[name]"',
        validate: (name) => {
          if (!name) {
            return '插件名称不能为空'
          }

          if (!/^\w+$/.test(name)) {
            return '插件名称不合法【只允许字母数字下划线】'
          }
          return true
        },
      },
      {
        type: 'text',
        name: 'description',
        message: '请输入插件描述，用于说明插件功能',
        validate: (description) => {
          if (!/^\w{5,}$/.test(description)) {
            return '插件描述至少包含5个字符'
          }
          return true
        },
      },
      {
        type: 'text',
        name: 'author',
        message: '请输入插件作者名称',
        initial: this.username,
        validate: (author) => (!author ? '作者名称不能为空' : true),
      },
      {
        type: 'confirm',
        name: 'isConfirm',
        message: (_, values) =>
          `即将创建插件项目"${this.#getPackageName(values.name)}"是否继续`,
        initial: true,
      },
    ])

    const { name, description, author } = answers
    const packageName = this.#getPackageName(name as string)
    const packagePath = path.resolve(this.pwd, packageName)
    const templateName = 'default'

    await this.loadingTask(
      this.renderTemplate(templateName, packageName, {
        packageName,
        description,
        author,
      }),
      '初始化目录',
    )

    await this.runTask(async () => {
      await this.loadingTask(this.git.init(), '初始化Git')
      await this.loadingTask(this.install(), '安装依赖')
      await this.loadingTask(
        this.seriesTask([
          this.husky.install(),
          this.husky.add('commit-msg', 'pnpm commitlint --edit $1'),
        ]),
        '安装Husky',
      )
    }, packagePath)

    log.success(
  `${this.color.cyan('Done. Now run:')}

    cd ${packageName}
    ${this.pm.bin} dev

  ${this.color.cyan('To develop inventor plugin.')}
  `,
    )
  }
}
