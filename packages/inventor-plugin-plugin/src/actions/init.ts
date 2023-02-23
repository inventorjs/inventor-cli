/**
 * 插件初始化 action
 * @author: sunkeysun
 */
import path from 'node:path'
import { Action } from '@inventorjs/cli-core'

export default class InitAction extends Action {
  description = '初始化创建一个插件项目，可快速开发插件'

  async run() {
    const answers = await this.prompt([
      {
        type: 'text',
        name: 'packageName',
        message: '请输入插件包名称，合法格式"(@scope/)?inventor-plugin-[name]',
        validate: (packageName) => {
          if (
            !this.pm.checkName(packageName) ||
            !this.util.getPluginName(packageName)
          ) {
            return '请输入合法的插件包名称'
          }
          return true
        },
      },
      {
        type: 'text',
        name: 'description',
        message: '请输入插件描述，用于说明插件功能',
        default: 'a powerful inventor plugin',
        validate: (value) =>
          !this.regex.desc.test(value)
            ? `请输入合法的插件描述(${this.regex.desc})`
            : true,
      },
      {
        type: 'text',
        name: 'author',
        message: '请输入插件作者名称',
        default: this.username,
        validate: (value) =>
          !this.regex.author.test(value)
            ? `请输入合法的插件作者名称(${this.regex.author})`
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
        name: 'isConfirmHusky',
        message: '是否需要安装 husky',
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
        name: 'isConfirmCommitlint',
        message: '是否需要安装 commitlint',
        default: true,
      },
      {
        type: 'confirm',
        name: 'isConfirm',
        message: (values) => `即将创建插件项目"${values.packageName}"是否继续`,
        default: true,
      },
    ])

    const {
      packageName,
      description,
      author,
      isConfirmGit,
      isConfirmEslint,
      isConfirmHusky,
      isConfirmCommitlint,
    } = answers
    const templateName = 'default'
    let dirName = packageName
    if (~packageName.indexOf('/')) {
      ;[, dirName] = packageName.split('/')
    }
    const packagePath = path.resolve(this.pwd, dirName)

    const packageJson = await this.getPackageJson()
    const cliVersion = packageJson?.version ?? 'latest'
    const pluginName = this.util.getPluginName(packageName)

    await this.renderTemplate(templateName, dirName, {
      data: {
        cliVersion,
        packageName,
        description,
        author,
        pluginClassName: this.util.pascalCase(`${pluginName}Plugin`),
      },
    })

    await this.runTaskContext(
      async () => {
        isConfirmGit && (await this.initGit())
        await this.install()
        ;(isConfirmHusky || isConfirmCommitlint || isConfirmEslint) &&
          (await this.addHusky())
        isConfirmCommitlint && (await this.addCommitLint())
        isConfirmEslint && (await this.addEslint())
      },
      { cwd: packagePath },
    )
    await this.logInitCmd({ dirName })
  }
}
