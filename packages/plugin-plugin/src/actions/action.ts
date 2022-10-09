/**
 * 添加 action
 * @author: sunkeysun
 */
import path from 'node:path'
import { Action } from '@inventorjs/core'

export default class extends Action {
  description = '初始化创建一个插件 action，可快速开发插件 action'
  options = []
  async action() {
    const nameRegex = /^[a-z-]{1,10}$/
    const descRegex = /^[a-z-\u4e00-\u9fa5]{5,20}$/
    const authorRegex = /^[\w-\u4e00-\u9fa5]{1,}$/
    const anwsers = await this.prompt([
      {
        name: 'name',
        type: 'text',
        message: '请输入 action 名称，将作为 action 的调用指令',
        validate: (value) => !nameRegex.test(value) ? `请输入合法的 action 名称(${nameRegex})` : true
      },
      {
        name: 'description',
        type: 'text',
        message: '请输入 action 描述',
        validate: (value) => !descRegex.test(value) ? `请输入合法的 action 描述(${descRegex})` : true
      },
      {
        name: 'author',
        type: 'text',
        message: '请输入 action 的作者',
        default: this.username,
        validate: (value) => !authorRegex.test(value) ? `请输入合法的作者名称(${authorRegex})` : true
      },
    ])
    const { name } = anwsers
    const actionPath = `src/actions/${name}.ts`

    this.renderTemplateFile(
      'files',
      'action.ts',
      actionPath,
      {
        data: anwsers,
      },
    )
    this.log.success(`action 路径：${path.resolve(this.pwd, actionPath)}`)
  }
}
