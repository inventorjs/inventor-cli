/**
 * action 入口
 * @author: sunkeysun
 */
import { Action } from '@inventorjs/cli-core'
import path from 'path'

export default class InitAction extends Action {
  description = '初始化前端应用'

  async action() {
    const anwsers = await this.prompt([
      {
        name: 'type',
        type: 'list',
        message: '请选择应用类型(默认使用TS)',
        choices: ['library', 'react-vite', 'react-webpack', 'react-webpack-js'],
      },
      {
        name: 'packageName',
        type: 'text',
        message: '请输入项目名称',
        default: ({ type }: { type: string }) =>
          type === 'library' ? 'inventor-app-lib' : 'inventor-app-project',
      },
      {
        name: 'description',
        type: 'text',
        message: '请输入项目描述',
        default: 'project init from inventor-cli'
      },
      {
        name: 'author',
        type: 'text',
        message: '请输入作者名称',
        default: this.username,
      },
      {
        when: ({ type }: { type: string }) => !['react-webpack-js'].includes(type),
        type: 'checkbox',
        name: 'addon',
        message: '选择要添加的应用附加能力',
        choices: [
          { name: 'Husky', value: 'husky' },
          {
            name: 'Eslint [husky, lint-staged, pre-commit hook]',
            value: 'eslint',
          },
          { name: 'Commitlint [husky, commit-msg hook]', value: 'commitlint' },
        ],
      },
    ])

    const { type, packageName, author, description, addon = [] } = anwsers

    const packageJson = await this.getPackageJson()
    const cliVersion = packageJson?.version ?? 'latest'

    await this.renderTemplate(type, packageName, { data: { packageName, author, description, cliVersion } })

    const cwd = path.resolve(this.pwd, packageName)
    await this.runTaskContext(async () => {
      await this.install()
      addon.includes('husky') && await this.addHusky();
      addon.includes('eslint') && await this.addEslint();
      addon.includes('commitlint') && await this.addCommitLint();
    }, { cwd })
    await this.logInitCmd({ dirName: packageName })
  }
}
