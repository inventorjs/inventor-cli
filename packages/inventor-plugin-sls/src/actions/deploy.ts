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
  Pick<Options, 'force' | 'updateConfig' | 'updateSrc' | 'followSymbolicLinks'>

export default class DeployAction extends Action {
  description = '部署应用到云端'
  options = getOptions([
    'force',
    'updateConfig',
    'updateSrc',
    'followSymbolicLinks',
  ])

  async run(_: string[], options: DeployOptions) {
    console.log(options, '111')
    const { base, updateConfig, updateSrc, ...slsOptions } = options
    const sls = getSls(base)
    const results = await this.loadingTask((loading) =>
      sls.deploy({
        ...slsOptions,
        deployType: updateSrc ? 'src' : (updateConfig ? 'config' : 'all'),
        reportStatus: (statusData) =>
          reportStatus(loading, statusData, 'deploy'),
      }),
    ) as ResultInstance[]

    outputResults(results, options)
  }
}
