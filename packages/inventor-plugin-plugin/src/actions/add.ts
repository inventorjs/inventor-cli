/**
 * 安装插件
 * @author: sunkeysun
 */
import { Action } from '@inventorjs/cli-core'

export default class AddAction extends Action {
  description = '安装插件并注册'
  options = [{ flags: '--local', description: '是否使用局部安装', defaultValue: false }]

  async action(options: { local?: boolean } = {}, packages: string[]) {
    const { local } = options
    if (!packages.length) {
      throw new Error('Please add inventor plugin package name!')
    }
    if (local) {
      throw new Error('Current directory not a valid npm package!')
    }

    const pluginNames = packages.map((pkg) => {
      const splitIndex = String(pkg).lastIndexOf('@')
      const packageName =
        !splitIndex || !~splitIndex ? pkg : pkg.slice(0, splitIndex)
      const pluginName = this.util.getPluginName(packageName)
      if (!pluginName) {
        throw new Error(`${pkg} is not a valid inventor plugin.`)
      }
      return pluginName
    })

    await this.addDependencies(packages, { global: !local })
    const configFrom = local ? 'local' : 'global'
    const rcConfig = (await this.rc.load(configFrom)) ?? { plugins: [] }
    packages.forEach((packageName) => {
      if (!rcConfig.plugins.find(([p]: [string]) => p === packageName)) {
        rcConfig.plugins.push([packageName])
      }
    })

    let isSaveError = false
    try {
      await this.rc.save(rcConfig, configFrom)
    } catch (err) {
      isSaveError = true
    }

    this.log.success(`Add plugin successfully, run blow show plugin help:`)
    this.log.raw('')
    isSaveError &&
      this.log.warn(
        `register plugin failed! please add "${this.color.red(
          packages.map((pkg) => `["${pkg}"]`).join(','),
        )}" to rc file's "plugins" field.`,
      )
    pluginNames.forEach((pluginName) => {
      this.log.info(`inventor ${pluginName} -h`)
    })
    this.log.raw('')
  }
}
