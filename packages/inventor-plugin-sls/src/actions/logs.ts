/**
 * action 入口
 * @author: sunkeysun
 */
import { Action } from '@inventorjs/cli-core'
import { getOptions, reportStatus, getSls } from '../common.js'

interface Options {
  stage?: string
  targets?: string[]
  force?: boolean
  path?: string
}

export default class DevAction extends Action {
  description = '拉取云函数运行日志'
  options = getOptions(['stage', 'targets', 'path'])

  async run(_: string[], options: Options) {
    const { path: basePath } = options
    const sls = getSls(basePath as string)
    this.loadingTask((loading) =>
      sls.logs({
        ...options,
        reportStatus: (statusData) => reportStatus(loading, statusData, 'logs'),
      }),
    )
  }
}
