/**
 * action 入口
 * @author: sunkeysun
 */
import { Action } from '@inventorjs/core'

export default class InitAction extends Action {
  description = '初始化前端应用'
  options = []
  async action() {
    const nameRegex = /\w{3}/
    const anwsers = await this.prompt([
      {
        name: 'name',
        type: 'text',
        message: '请输入你的名字',
        validate: (name) => ( !nameRegex.test(name) ? `请输入合法的名字(${nameRegex.toString()})` : true),
      },
      {
        name: 'age',
        type: 'number',
        message: '请输入你的年龄',
        validate: (age) => (age > 100 || age < 0 ? '你的年龄不太正常喔([0, 100])' : true),
      },
    ])

    this.log.info('下面为你创建一个欢迎模版')
    await this.renderTemplate('default', 'welecome', {
      data: anwsers,
    })
  }
}
