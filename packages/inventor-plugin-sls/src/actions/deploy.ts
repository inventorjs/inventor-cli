/**
 * action 入口
 * @author: sunkeysun
 */
import { Action } from '@inventorjs/cli-core'
import { getOptions, getSls } from '../helpers.js'

interface Options {
  stage?: string
  targets?: string[]
  force?: boolean
  path?: string
  json?: boolean
}

export default class DeployAction extends Action {
  description = '部署应用到云端'
  options = getOptions([
    'stage',
    'targets',
    'force',
    'path',
    'updateConfig',
    'updateSrc',
    'json',
  ])

  async run(_: string[], options: Options) {
    const { path: basePath } = options
    const sls = getSls(basePath as string)
    const results = await this.loadingTask((loading) =>
      sls.deploy({
        ...options,
        reportStatus(statusData) {
          if (statusData.instance) {
            const duration =
              statusData.point === 'end' ? `(${statusData.duration}ms)` : ''
            loading.prefixText = `实例[${statusData.instance?.name}${duration}]`
          }
          loading.text = statusData.statusText
        },
      }),
    )
    console.log(results)
  }
}
