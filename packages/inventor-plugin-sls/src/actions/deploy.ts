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
  type Options,
  type BaseOptions,
  outputResults,
} from '../common.js'

type DeployOptions = BaseOptions &
  Pick<
    Options,
    | 'force'
    | 'updateConfig'
    | 'updateCode'
    | 'followSymbolicLinks'
  >

export default class DeployAction extends Action {
  description = '部署应用到云端'
  options = getOptions([
    'force',
    'updateConfig',
    'updateSrc',
    'followSymbolicLinks',
  ])

  async run(_: string[], options: DeployOptions) {
    const {
      base,
      updateConfig,
      updateCode,
      pollTimeout,
      pollInterval,
      ...slsOptions
    } = options
    const sls = getSls(base)
    const results = (await this.loadingTask((loading) =>
      sls.deploy({
        ...slsOptions,
        pollTimeout: Number(pollTimeout),
        pollInterval: Number(pollInterval),
        deployType: updateCode ? 'code' : updateConfig ? 'config' : 'all',
        reportStatus: (statusData) =>
          reportStatus(loading, statusData, 'deploy'),
      }),
    )) as ResultInstance[]

    outputResults(results, options)
  }
}
