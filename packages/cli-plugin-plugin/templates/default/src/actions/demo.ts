/**
 * demo action
 * @author: <%- author %>
 */
 import { plugin } from '@inventorjs/cli-core'

type Options {
   name?: string
}

export default class Action extends plugin.Action {
  name = 'demo'
  description = '这是一个Demo插件'
  options = [
    { option: '-h --help [help]', description: 'Demo 选项' },
  ]
  async action(options: Options) {

  }
}
