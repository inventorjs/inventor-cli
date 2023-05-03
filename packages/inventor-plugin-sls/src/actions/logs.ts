/**
 * action 入口
 * @author: sunkeysun
 */
import { Action } from '@inventorjs/cli-core'
import {
  getOptions,
  reportStatus,
  getSls,
  type BaseOptions,
  type Options,
} from '../common.js'

export type LogsOptions = BaseOptions &
  Pick<Options, 'logsPeriod' | 'logsInterval' | 'logsQuery' | 'logsClean'>

export default class LogsAction extends Action {
  description = '拉取云函数运行日志'
  options = getOptions(['logsPeriod', 'logsInterval', 'logsQuery', 'logsClean'])

  async run(_: string[], options: Required<LogsOptions>) {
    const {
      base,
      pollTimeout,
      pollInterval,
      logsPeriod,
      logsInterval,
      logsQuery,
      logsClean,
    } = options
    const sls = getSls(base)
    this.loadingTask((loading) =>
      sls.logs({
        ...options,
        pollTimeout: Number(pollTimeout),
        pollInterval: Number(pollInterval),
        devServer: {
          logsInterval: +logsInterval,
          logsPeriod: +logsPeriod,
          logsQuery,
          logsClean,
        },
        reportStatus: (statusData) => reportStatus(loading, statusData, 'logs'),
      }),
    )
  }
}
