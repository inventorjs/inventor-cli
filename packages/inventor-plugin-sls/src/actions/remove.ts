/**
 * action 入口
 * @author: sunkeysun
 */
import { Action } from '@inventorjs/cli-core'
import { getOptions, reportStatus, getSls } from '../common.js'

interface Options {
  stage?: string
  targets?: string[]
  force?: boolean
  path?: string
  json?: boolean
}

export default class DeployAction extends Action {
  description = '删除云端应用'
  options = getOptions(['stage', 'targets', 'path', 'json'])

  async run(_: string[], options: Options) {
    const { path: basePath } = options
    const sls = getSls(basePath as string)
    const results = await this.loadingTask((loading) =>
      sls.remove({
        ...options,
        reportStatus: (statusData) =>
          reportStatus(loading, statusData, 'remove'),
      }),
    )
    console.log(results)
  }
}
