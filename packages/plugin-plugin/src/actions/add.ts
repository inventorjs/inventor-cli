/**
 * 安装插件
 * @author: sunkeysun
 */
 import { Action } from '@inventorjs/core'
 
 export default class extends Action {
   description = '安装插件并注册'
   options = [
    { option: '-p --plugin <plugin>', description: '插件 npm 包名称@版本' },
    { option: '-g --global', description: '是否是全局安装' },
   ]
   async action(options = {}) {
    const { plugin, global = false } = options as { plugin: string, global?: boolean }
    if (!plugin) {
      throw new Error('Please add inventor plugin package name!')
    }
    const splitIndex = String(plugin).lastIndexOf('@')
    const packageName = !splitIndex || !~splitIndex ? plugin : plugin.slice(0, splitIndex)
    const pluginName = this.util.getPluginName(packageName)  
    if (!pluginName) {
      throw new Error(`${plugin} is not a valid inventor plugin.`)
    }

    await this.addDependencies([plugin], { global })
    const configFrom = global ? 'global' : 'local'
    const rcConfig = await this.rc.load(configFrom) ?? { plugins: [] }
    if (!rcConfig.plugins.find(([p]: [string]) => p === packageName)) {
      rcConfig.plugins.push([packageName])
    }
    await this.rc.save(rcConfig, configFrom)
    this.log.success(`Add ${packageName} successful, Start use to run:`)
    this.log.raw('')
    this.log.info(`inventor ${pluginName} -h`)
    this.log.raw('')
   }
 }
