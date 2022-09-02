/**
 * 配置读写模块
 * @author: sunkeysun
 */
import { cosmiconfig } from 'cosmiconfig'

const explorer = cosmiconfig('inventor')

export async function search(dirname?: string)  {
  try {
    const result = await explorer.search(dirname) ?? {}
    return result
  } catch (err) {
    return { config: null }
  }
}
