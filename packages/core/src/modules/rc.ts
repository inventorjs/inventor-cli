/**
 * 配置读写模块
 * @author: sunkeysun
 */
import { cosmiconfig } from 'cosmiconfig'
import { pwd, homedir } from './env.js'

export type LoadFrom = 'local' | 'global'

const explorer = cosmiconfig('inventor')

export async function search(dirname?: string): Promise<{ config?: Record<string, unknown> }>  {
  try {
    const result = await explorer.search(dirname) ?? {}
    return result
  } catch (err) {
    return { config: {} }
  }
}

export async function load(from: LoadFrom = 'local') {
  const location = from === 'global' ? homedir() : pwd()
  const result = await search(location)
  return result?.config ?? {}
}
