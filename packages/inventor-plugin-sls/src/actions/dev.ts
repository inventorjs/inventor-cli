/**
 * action 入口
 * @author: sunkeysun
 */
import { Action } from '@inventorjs/cli-core'
import { getOptions, getSls } from '../helpers.js'

interface Options {
  stage?: string
  targets?: string[]
  force?: boolean
  path?: string
}

export default class DevAction extends Action {
  description = '启动远程开发服务'
  options = getOptions(['stage', 'targets', 'force', 'path'])

  async run(_: string[], options: Options) {
    const { path: basePath } = options
    const sls = getSls(basePath as string)
    this.loadingTask((loading) =>
      sls.dev({
        ...options,
        reportStatus(statusData) {
          if (statusData.instance) {
            loading.prefixText = `实例[${statusData.instance?.name}]`
          }
          loading.text = statusData.statusText
          if (statusData.point === 'end') {
            loading.text = '开发模式监听中'
          }
        },
      }),
    )
  }
}