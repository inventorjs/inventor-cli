/**
 * action 入口
 * @author: sunkeysun
 */
import type { ResultInstance } from '@inventorjs/sls-core'

import { Action } from '@inventorjs/cli-core'
import {
  getOptions,
  reportStatus,
  getSls,
  outputResults,
  type Options,
  processOptions, 
} from '../common.js'

const options = ['base', 'stage', 'targets', 'pollTimeout', 'pollInterval'] as const
type InfoOptions = Pick<Options, typeof options[number]>

export default class InfoAction extends Action {
  description = '获取应用详情'
  options = getOptions(options as unknown as string[])

  async run(_: string[], options: InfoOptions) {
    const { base } = options
    const sls = getSls(base)
    const results = (await this.loadingTask((loading) =>
      sls.info({
        ...processOptions(options),
        reportStatus: (statusData) => reportStatus(loading, statusData, 'info'),
      }),
    )) as ResultInstance[]

    outputResults(results, options)
  }
}
