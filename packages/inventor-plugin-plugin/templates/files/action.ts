/**
 * action 入口
 * @author: <%- author %>
 */
import { Action } from '@inventorjs/cli-core'

export default class <%- actionClassName %> extends Action {
  description = '<%- description %>'

  async run() {
    const anwsers = await this.prompt([
      {
        name: 'name',
        type: 'text',
        message: '请输入你的名字',
        validate: (name) =>
          !this.regex.name.test(name)
            ? `请输入合法的名字(${this.regex.name.toString()})`
            : true,
      },
    ])
    const { name } = anwsers

    this.log.success(`Hello，${name}!`)
  }
}
