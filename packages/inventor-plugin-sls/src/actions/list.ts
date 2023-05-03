/**
 * action 入口
 * @author: sunkeysun
 */
import type { ResultInstance } from '@inventorjs/sls-core'

import { Action } from '@inventorjs/cli-core'
import {
  getOptions,
  getSls,
  type BaseOptions,
  type Options,
} from '../common.js'

export type ListOptions = Pick<Options, 'base' | 'app' | 'org' | 'name' | 'stage' | 'component'>

export default class ListAction extends Action {
  description = '获取应用实例列表'
  options = getOptions(['base', 'org', 'app', 'name', 'stage', 'component'])

  async run(_: string[], options: ListOptions) {
    const { base } = options
    const sls = getSls(base)
    const list = await this.loadingTask(
      sls.list(options),
      '拉取实例列表'
    )
    console.log(list, '1111')
  }
}
