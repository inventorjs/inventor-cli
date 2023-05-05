/**
 * action 入口
 * @author: sunkeysun
 */
import { Action } from '@inventorjs/cli-core'
import {
  type Options,
  getOptions,
  reportStatus,
  getSls,
  processOptions,
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
  'logsVerbose',
  'followSymbolicLinks',
] as const
export type DevOptions = Pick<Options, typeof options[number]>

export default class DevAction extends Action {
  description = '启动云函数远程开发服务'
  options = getOptions(options as unknown as string[])

  async run(_: string[], options: DevOptions) {
    const { base } = options
    const sls = getSls(base)
    this.loadingTask((loading) =>
      sls.dev({
        ...processOptions(options),
        reportStatus: (statusData) => reportStatus(loading, statusData, 'dev'),
      }),
    )
  }
}
