/**
 * 添加 action
 * @author: sunkeysun
 */
import path from 'node:path'
import { Action } from '@inventorjs/cli-core'

export default class ActionAction extends Action {
  description = '初始化创建一个插件 action，可快速开发插件 action'

  async run() {
    const anwsers = await this.prompt([
      {
        name: 'name',
        type: 'text',
        message: '请输入 action 名称，将作为 action 的调用指令',
        validate: (value) => !this.regex.actionName.test(value) ? `请输入合法的 action 名称(${this.regex.actionName})` : true
      },
      {
        name: 'description',
        type: 'text',
        message: '请输入 action 描述',
        validate: (value) => !this.regex.desc.test(value) ? `请输入合法的 action 描述(${this.regex.desc})` : true
      },
      {
        name: 'author',
        type: 'text',
        message: '请输入 action 的作者',
        default: this.username,
        validate: (value) => !this.regex.author.test(value) ? `请输入合法的作者名称(${this.regex.author})` : true
      },
    ])
    const { name } = anwsers
    const actionPath = `src/actions/${name}.ts`

    this.renderTemplateFile(
      'files',
      'action.ts',
      actionPath,
      {
        data: {
          ...anwsers,
          actionPluginName: this.util.pascalCase(`${anwsers.name}Action`),
        },
      },
    )
    this.log.success(`action 路径：${path.resolve(this.pwd, actionPath)}`)
  }
}
