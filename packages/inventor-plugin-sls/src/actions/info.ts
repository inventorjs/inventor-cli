/**
 * action 入口
 * @author: sunkeysun
 */
import { Action } from '@inventorjs/cli-core'
import { getOptions, getSls } from '../helpers.js'

interface Options {
  stage?: string
  targets?: string[]
  path?: string
}

export default class InfoAction extends Action {
  description = '获取应用详情'
  options = getOptions(['stage', 'targets', 'path'])

  async run(_: string[], options: Options) {
    const { path: basePath } = options
    const sls = getSls(basePath as string)
    const infoList = await this.loadingTask((loading) =>
      sls.info({
        ...options,
        reportStatus(statusData) {
          if (statusData.instance) {
            loading.prefixText = `实例[${statusData.instance.name}]`
          }
          loading.text = statusData.statusText
        },
      }),
    )
    console.log(infoList)
  }
}
