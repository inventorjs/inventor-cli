/**
 * action 入口
 * @author: sunkeysun
 */
import type { ResultInstance } from '@inventorjs/sls-core'

import { Action } from '@inventorjs/cli-core'
import {
  type Options,
  getOptions,
  reportStatus,
  getSls,
  outputResults,
  processInputs,
} from '../common.js'

const options = [
  'base',
  'targets',
  'stage',
  'force',
  'inputs',
  'updateConfig',
  'updateCode',
  'followSymbolicLinks',
  'pollTimeout',
  'pollInterval',
  'json',
  'verbose',
] as const

type DeployOptions = Pick<Options, typeof options[number]>

export default class DeployAction extends Action {
  description = '部署应用到云端'
  options = getOptions(options as unknown as string[])

  async run(_: string[], options: DeployOptions) {
    const {
      base,
      inputs,
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
        inputs: processInputs(inputs),
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
