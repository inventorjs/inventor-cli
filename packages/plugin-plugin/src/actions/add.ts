/**
 * 安装插件
 * @author: sunkeysun
 */
 import { Action } from '@inventorjs/core'
 
 export default class extends Action {
   description = '安装插件并注册'
   options = [
    { option: '--no-global', description: '是否取消全局安装' },
   ]
   async action(options: { global?: boolean } = {}, packages: string[]) {
    const { global = true } = options as { global?: boolean }
    if (!packages.length) {
      throw new Error('Please add inventor plugin package name!')
    }
    const pluginNames = packages.map((pkg) => {
      const splitIndex = String(pkg).lastIndexOf('@')
      const packageName = !splitIndex || !~splitIndex ? pkg : pkg.slice(0, splitIndex)
      const pluginName = this.util.getPluginName(packageName)  
      if (!pluginName) {
        throw new Error(`${pkg} is not a valid inventor plugin.`)
      }
      return pluginName
    })

    await this.addDependencies(packages, { global })
    const configFrom = global ? 'global' : 'local'
    const rcConfig = await this.rc.load(configFrom) ?? { plugins: [] }
    packages.forEach((packageName) => {
      if (!rcConfig.plugins.find(([p]: [string]) => p === packageName)) {
        rcConfig.plugins.push([packageName])
      }
    })
    await this.rc.save(rcConfig, configFrom)
    this.log.success(`Add plugin successfully, run blow show plugin help:`)
    this.log.raw('')
    pluginNames.forEach((pluginName) => {
      this.log.info(`inventor ${pluginName} -h`)
    })
    this.log.raw('')
   }
 }
