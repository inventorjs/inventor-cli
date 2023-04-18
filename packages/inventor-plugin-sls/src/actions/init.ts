/**
 * action 入口
 * @author: sunkeysun
 */
import { Action } from '@inventorjs/cli-core'

export default class InitAction extends Action {
  description = '通过模版初始化 serverless 项目'

  async run() {
    const anwsers = await this.prompt([
      {
        name: 'name',
        type: 'list',
        message: '请选择应用模版类型',
        choices: ['default'],
      },
    ])

    const { name } = anwsers

    await this.renderTemplate(name, './')
    this.log.success('serverless 模版初始化成功')
  }
}
