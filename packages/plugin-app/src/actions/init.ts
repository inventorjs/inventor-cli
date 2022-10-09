/**
 * action 入口
 * @author: sunkeysun
 */
import { Action } from '@inventorjs/core'
import path from 'path'

export default class extends Action {
  description = '初始化前端应用'
  options = []
  async action() {
    const anwsers = await this.prompt([
      {
        name: 'packageName',
        type: 'text',
        message: '请输入项目名称',
        default: 'inventor-app-project',
      },
      {
        name: 'type',
        type: 'list',
        message: '请选择应用类型',
        choices: ['react-webpack-js'],
      },
    ])

    const { type, packageName } = anwsers

    await this.renderTemplate(type, packageName)
    await this.install({ cwd: path.resolve(this.pwd, packageName) })
    await this.logInitCmd({ dirName: packageName })
  }
}
