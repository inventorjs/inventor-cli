/**
 * 插件初始化 action
 * @author: sunkeysun
 */
import path from 'node:path'
import { Action, log } from '@inventorjs/cli-core'

export default class InitAction extends Action {
  description = '初始化创建一个插件项目，可快速开发插件'
  options = []

  #getPackageName(name: string) {
    return `inventor-plugin-${name}`
  }

  async action() {
    const answers = await this.prompt([
      {
        type: 'text',
        name: 'name',
        message:
          '请输入插件名称，项目目录将自动初始化为"inventor-plugin-[name]"',
        validate: (name) => {
          const regex = /^[a-z0-9-]{3,}$/
          if (!regex.test(name)) {
            return `请输入合法的插件名称(正则：${regex.toString()})`
          }
          return true
        },
      },
      {
        type: 'text',
        name: 'description',
        message: '请输入插件描述，用于说明插件功能',
        validate: (description) => {
          const regex = /^[a-z0-9-]{5,}$/
          if (!regex.test(description)) {
            return `请输入合法的插件描述(正则：${regex.toString()})`
          }
          return true
        },
      },
      {
        type: 'text',
        name: 'author',
        message: '请输入插件作者名称',
        default: this.username,
        validate: (author) => {
          const regex = /^[a-z0-9-]{3,}/
          if (!regex.test(author)) {
            return `请输入合法的插件作者名称(正则：${regex.toString()})`
          }
          return true
        },
      },
      {
        type: 'confirm',
        name: 'isConfirm',
        message: (values) =>
          `即将创建插件项目"${this.#getPackageName(values.name)}"是否继续`,
        default: true,
      },
    ])

    const { name, description, author } = answers
    const packageName = this.#getPackageName(name as string)
    const packagePath = path.resolve(this.pwd, packageName)
    const templateName = 'default'

    await this.renderTemplate(templateName, packageName, {
      data: {
        packageName,
        description,
        author,
      },
    })

    await this.runTask(async () => {
        await this.loadingTask(this.git.init(), '初始化 git')
        await this.loadingTask(this.install(), '安装依赖')
        await this.loadingTask(this.addCommitLint(), '安装 commitlint')
    }, { cwd: packagePath })

    log.success(
  `${this.color.cyan('Done. Now run:')}

    cd ${packageName}
    ${this.pm.bin} dev

  ${this.color.cyan('To develop inventor plugin.')}
  `,
    )
  }
}
