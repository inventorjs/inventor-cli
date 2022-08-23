/**
 * 添加 action
 * @author: sunkeysun
 */
import { plugin } from '@inventorjs/cli-core'

interface Options {
  name?: string
}
export default class Action extends plugin.Action {
  description = '初始化创建一个插件项目，可快速开发插件'
  options = []
  async action(options: Options) {
    console.log(options)
  }
}
