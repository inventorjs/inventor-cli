/**
 * action 入口
 * @author: sunkeysun
 */
import { Action } from '@inventorjs/core'
import path from 'path'

export default class InitAction extends Action {
  description = '初始化前端应用'
  options = []
  async action() {
    const anwsers = await this.prompt([
      {
        name: 'name',
        type: 'text',
        message: '请输入项目名称',
        default: 'inventor-app-project',
      },
      {
        name: 'type',
        type: 'list',
        message: '请选择应用类型',
        choices: ['react-webpack'],
      },
    ])

    const { type, name } = anwsers

    await this.loadingTask(this.renderTemplate(type, name), '生成目录')
    await this.loadingTask(
      this.install({ cwd: path.resolve(this.pwd, name) }),
      '安装依赖',
    )
  }
}
