/**
 * action 入口
 * @author: sunkeysun
 */
import { Action } from '@inventorjs/cli-core'

export default class InitAction extends Action {
  description = 'sls plugin'

  async run() {
    const anwsers = await this.prompt([
      {
        name: 'name',
        type: 'text',
        message: '请输入你的名字',
        validate: (name: string) => ( !this.regex.name.test(name) ? `请输入合法的名字(${this.regex.name})` : true),
      },
    ])

    const { name } = anwsers

    const targetDir = `welcome-${name}`

    await this.renderTemplate('default', targetDir, {
      data: anwsers,
    })
    this.log.success(`欢迎模版[${targetDir}]初始化成功`)
  }
}
