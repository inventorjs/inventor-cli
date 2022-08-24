/**
 * 添加 action
 * @author: sunkeysun
 */
import { Action, ActionOptions } from '@inventorjs/cli-core'

export default class ActionAction extends Action {
  description = '初始化创建一个插件项目，可快速开发插件'
  options = []
  async action(options: ActionOptions) {
    console.log(options)
  }
}
