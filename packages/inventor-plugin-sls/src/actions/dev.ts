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
  BaseOptions,
} from '../common.js'

export type DevOptions = BaseOptions &
  Pick<
    Options,
    | 'logsPeriod'
    | 'logsInterval'
    | 'logsQuery'
    | 'logsClean'
    | 'followSymbolicLinks'
  >

export default class DevAction extends Action {
  description = '启动云函数远程开发服务'
  options = getOptions([
    'logsPeriod',
    'logsInterval',
    'logsQuery',
    'logsClean',
    'followSymbolicLinks',
  ])

  async run(_: string[], options: Required<DevOptions>) {
    const {
      base,
      logsPeriod,
      logsInterval,
      logsQuery,
      logsClean,
      pollTimeout,
      pollInterval,
      ...slsOptions
    } = options
    const sls = getSls(base)
    this.loadingTask((loading) =>
      sls.dev({
        ...slsOptions,
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
