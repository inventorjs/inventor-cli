/**
 * action 入口
 * @author: sunkeysun
 */
import type { ResultInstance } from '@inventorjs/sls-core'

import { Action } from '@inventorjs/cli-core'
import { getOptions, reportStatus, getSls, type BaseOptions, outputResults } from '../common.js'

export default class InfoAction extends Action {
  description = '获取应用详情'
  options = getOptions()

  async run(_: string[], options: BaseOptions) {
    const { base } = options
    const sls = getSls(base)
    const results = await this.loadingTask((loading) =>
      sls.info({
        ...options,
        reportStatus: (statusData) => reportStatus(loading, statusData, 'info'),
      }),
    ) as ResultInstance[]

    outputResults(results, options)
  }
}
