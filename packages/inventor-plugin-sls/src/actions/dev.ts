/**
 * action 入口
 * @author: sunkeysun
 */
import { Action } from '@inventorjs/cli-core'
import {
  getOptions,
  reportStatus,
  getSls,
  type Options,
  processInputs,
} from '../common.js'

const options = [
  'base',
  'targets',
  'stage',
  'inputs',
  'pollTimeout',
  'pollInterval',
  'logsPeriod',
  'logsInterval',
  'logsQuery',
  'logsClean',
  'followSymbolicLinks',
  'json',
  'verbose',
] as const
export type DevOptions = Pick<Options, typeof options[number]>

export default class DevAction extends Action {
  description = '启动云函数远程开发服务'
  options = getOptions(options as unknown as string[])

  async run(_: string[], options: Required<DevOptions>) {
    const {
      base,
      logsPeriod,
      logsInterval,
      logsQuery,
      logsClean,
      pollTimeout,
      pollInterval,
      inputs,
      ...slsOptions
    } = options
    const sls = getSls(base)
    this.loadingTask((loading) =>
      sls.dev({
        ...slsOptions,
        inputs: processInputs(inputs),
        pollTimeout: Number(pollTimeout),
        pollInterval: Number(pollInterval),
        devServer: {
          logsInterval: +logsInterval,
          logsPeriod: +logsPeriod,
          logsClean,
          logsQuery,
        },
        reportStatus: (statusData) => reportStatus(loading, statusData, 'dev'),
      }),
    )
  }
}
