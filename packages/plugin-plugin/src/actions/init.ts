/**
 * 插件初始化 action
 * @author: sunkeysun
 */
import path from 'node:path'
import { Action } from '@inventorjs/core'

export default class extends Action {
  description = '初始化创建一个插件项目，可快速开发插件'
  options = []

  #getPackageName(name: string) {
    return `inventor-plugin-${name}`
  }

  async action() {
    const nameRegex = /^[a-z-]{1,10}$/
    const descRegex = /^[\sa-z-\u4e00-\u9fa5]{5,30}$/
    const authorRegex = /^[\s\w-\u4e00-\u9fa5]{1,20}$/
    const answers = await this.prompt([
      {
        type: 'text',
        name: 'name',
        message:
          '请输入插件名称，项目目录将自动初始化为"inventor-plugin-[name]"',
        validate: (value) =>
          !nameRegex.test(value) ? `请输入合法的插件名称(${nameRegex})` : true,
      },
      {
        type: 'text',
        name: 'description',
        message: '请输入插件描述，用于说明插件功能',
        default: 'a powerful inventor plugin',
        validate: (value) =>
          !descRegex.test(value) ? `请输入合法的插件描述(${descRegex})` : true,
      },
      {
        type: 'text',
        name: 'author',
        message: '请输入插件作者名称',
        default: this.username,
        validate: (value) =>
          !authorRegex.test(value)
            ? `请输入合法的插件作者名称(${authorRegex})`
            : true,
      },
      {
        type: 'confirm',
        name: 'isConfirmGit',
        message: '是否需要初始化 Git',
        default: true,
      },
      {
        type: 'confirm',
        name: 'isConfirmEslint',
        message: '是否需要安装 eslint',
        default: true,
      },
      {
        type: 'confirm',
        name: 'isConfirmHusky',
        message: '是否需要安装 Husky',
        default: true,
      },
      {
        type: 'confirm',
        name: 'isConfirmCommitlint',
        message: '是否需要安装 commitlint',
        default: true,
      },
      {
        type: 'confirm',
        name: 'isConfirm',
        message: (values) =>
          `即将创建插件项目"${this.#getPackageName(values.name)}"是否继续`,
        default: true,
      },
    ])

    const {
      name,
      description,
      author,
      isConfirmGit,
      isConfirmEslint,
      isConfirmHusky,
      isConfirmCommitlint,
    } = answers
    const packageName = this.#getPackageName(name)
    const packagePath = path.resolve(this.pwd, packageName)
    const templateName = 'default'

    await this.renderTemplate(templateName, packageName, {
      data: {
        packageName,
        description,
        author,
        isConfirmCommitlint,
        isConfirmEslint,
      },
    })

    await this.runTask(
      async () => {
        isConfirmGit && (await this.loadingTask(this.git.init(), '初始化 git'))
        await this.loadingTask(this.install(), '安装依赖')
        isConfirmHusky &&
          (await this.loadingTask(this.installHusky(), '安装 husky'))
        isConfirmCommitlint &&
          (await this.loadingTask(this.addCommitLint(), '添加 commitlint'))
      },
      { cwd: packagePath },
    )

    this.log.success('Init successful. Start develop to run:')
    this.log.raw(
      `
      cd ${packageName}
      ${this.pm.bin} dev
  `,
      { boxen: true },
    )
  }
}
