/**
 * action 入口
 * @author: sunkeysun
 */
import { type ResultInstance } from '@inventorjs/sls-core'
import { Action } from '@inventorjs/cli-core'
import {
  getOptions,
  getSls,
  type Options,
} from '../common.js'

const options = ['base', 'org', 'app', 'name', 'stage', 'component', 'json'] as const
export type ListOptions = Pick<Options, typeof options[number]>

export default class ListAction extends Action {
  description = '获取应用实例列表(无需 serverless 配置)'
  options = getOptions(options as unknown as string[])

  async run(_: string[], options: ListOptions) {
    const { base, json } = options
    const sls = getSls(base)
    const list = await this.loadingTask(
      sls.list(options),
      '拉取实例列表'
    ) as ResultInstance[]
    if (!list?.length) {
      this.log.warn('当前没有符合条件的实例')
      return
    }
    if (json) {
      this.log.raw(JSON.stringify(list))
      return
    }
    const maxLength = 20
    const headers = [
      { value: 'appName', label: '应用(app)' },
      { value: 'stageName', label: '环境(stage)' },
      { value: 'componentName', label: '组件(component)' },
      { value: 'instanceName', label: '实例(name)' },
      { value: 'instanceStatus', label: '实例状态' },
      { value: 'updatedAt', label: '最后更新' },
    ]
    const data = list.map((item) => {
      return headers.reduce<string[]>((result, header) => {
        let value = item[header.value as keyof ResultInstance] as string
        if (value.length > maxLength) {
          value = String(value).slice(0, maxLength) + '...'
        }
        if (header.value === 'instanceStatus') {
          if (value === 'error') {
            value = this.color.red(value)
          } else if (value === 'active') {
            value = this.color.green(value)
          } else {
            value = this.color.cyan(value)
          }
        }
        if (['updatedAt', 'createdAt'].includes(header.value)) {
          value = this.util.dateFormat(+value)
        }
        return [...result, value]
      }, [])
    })
    const headerNames = headers.map((header) => this.color.yellow(header.label))
    this.log.table([headerNames, ...data])
  }
}
