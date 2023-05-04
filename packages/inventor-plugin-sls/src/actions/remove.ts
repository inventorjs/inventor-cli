/**
 * action 入口
 * @author: sunkeysun
 */
import type { ResultInstance } from '@inventorjs/sls-core'

import { Action } from '@inventorjs/cli-core'
import { type Options, getOptions, reportStatus, getSls, outputResults } from '../common.js'

const options = ['base', 'stage', 'targets', 'pollTimeout', 'pollInterval'] as const
type RemoveOptions = Pick<Options, typeof options[number]>

export default class DeployAction extends Action {
  description = '删除云端应用'
  options = getOptions()

  async run(_: string[], options: RemoveOptions) {
    const { base, pollTimeout, pollInterval } = options
    const sls = getSls(base)
    const results = await this.loadingTask((loading) =>
      sls.remove({
        ...options,
        pollTimeout: Number(pollTimeout),
        pollInterval: Number(pollInterval),
        reportStatus: (statusData) =>
          reportStatus(loading, statusData, 'remove'),
      }),
    ) as ResultInstance[]
    outputResults(results, options)
  }
}
