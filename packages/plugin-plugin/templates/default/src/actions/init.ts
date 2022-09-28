/**
 * action 入口
 * @author: <%- author %>
 */
import { Action } from '@inventorjs/core'

export default class extends Action {
  description = '<%- description %>'
  options = []
  async action() {
    const nameRegex = /\w{3}/
    const anwsers = await this.prompt([
      {
        name: 'name',
        type: 'text',
        message: '请输入项目名称',
        validate: (name: string) => ( !nameRegex.test(name) ? `请输入合法的项目名称(${nameRegex.toString()})` : true),
      },
    ])

    this.log.info('下面为你创建一个欢迎模版')
    await this.renderTemplate('default', 'welcome', {
      data: anwsers,
    })
  }
}
