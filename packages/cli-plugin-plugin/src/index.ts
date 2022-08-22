/**
 * 插件管理插件
 * @author: sunkeysun
 */
import { plugin } from '@inventorjs/cli-core'
import init from './actions/init.js'
import register from './actions/register.js'

class Plugin extends plugin.Plugin {
  description = '用于实现 inventor 插件相关功能'
  actions = [init, register]
}

export default Plugin
