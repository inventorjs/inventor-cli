/**
 * 添加 action
 * @author: sunkeysun
 */
import { Action } from '@inventorjs/cli-core'

export default class ActionAction extends Action {
  description = '初始化创建一个插件 action，可快速开发插件 action'
  options = []
  async action() {
    const anwsers = await this.prompts([
      {
        name: 'actionName',
        type: 'text',
        message: '请输入 action 名称，将作为 action 的调用指令',
        validate: (actionName) =>
          !/^[a-z-]{1,10}$/.test(actionName)
            ? 'action 只能是 1-10 个字符[小写字母和-]'
            : true,
      },
    ])
    const { actionName } = anwsers

    await this.runTask(async () => {
      await this.renderTemplateFile(
        'default',
        'src/actions/init.ts',
        `src/actions/${actionName}.ts`,
        {},
      )
    })
  }
}
