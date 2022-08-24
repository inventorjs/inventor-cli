/**
 * 插件管理插件
 * @author: sunkeysun
 */
import { Plugin } from '@inventorjs/cli-core'
import init from './actions/init.js'
import register from './actions/register.js'

export default class PluginPlugin extends Plugin {
  description = '用于实现 inventor 插件相关功能'
  actions = [init, register]
}
