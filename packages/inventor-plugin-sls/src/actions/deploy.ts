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
  processOptions,
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
  'detail',
] as const

type DeployOptions = Pick<Options, typeof options[number]>

export default class DeployAction extends Action {
  description = '部署应用到云端'
  options = getOptions(options as unknown as string[])

  async run(_: string[], options: DeployOptions) {
    const { base } = options
    const sls = getSls(base)

    const results = (await this.loadingTask((loading) =>
      sls.deploy({
        ...processOptions(options),
        reportStatus: (statusData) =>
          reportStatus(loading, statusData, 'deploy'),
      }),
    )) as ResultInstance[]

    outputResults(results, options)
  }
}
