/**
 * action 入口
 * @author: <%- author %>
 */
import { Action } from '@inventorjs/cli-core'

export default class extends Action {
  description = '<%- description %>'
  options = []
  async action() {
    const anwsers = await this.prompt([
      {
        name: 'name',
        type: 'text',
        message: '请输入你的名字',
        validate: (name) => (!name ? '你的名字不能为空' : true),
      },
      {
        name: 'age',
        type: 'number',
        message: '请输入你的年龄',
        validate: (age) => (age > 100 || age < 0 ? '你的年龄不太正常喔' : true),
      },
    ])

    this.log.info('下面为你创建一个欢迎模版')
    await this.renderTemplate('default', 'welecome', {
      data: anwsers,
    })
  }
}
