/**
 * 配置读写模块
 * @author: sunkeysun
 */
import path from 'node:path'
import { cosmiconfig } from 'cosmiconfig'
import { pwd, homedir } from './env.js'
import { writeFile } from './fs.js'

export type LoadFrom = 'local' | 'global'

const explorer = cosmiconfig('inventor')

export async function search(dirname?: string): ReturnType<typeof explorer.search>  {
  const result = await explorer.search(dirname)
  if (result && path.dirname(result.filepath) === dirname) {
    return result
  }
  return null
}

export async function load(from: LoadFrom = 'local') {
  const location = from === 'global' ? homedir() : pwd()
  const result = await search(location)
  return result?.config ?? null
}

export async function save(rcConfig: Record<string, unknown>, from: LoadFrom = 'local') {
  const jsonData = JSON.stringify(rcConfig, null, 2)
  const location = from === 'global' ? homedir() : pwd()
  const result = await search(location)
  let filepath = result?.filepath ?? ''
  if (!filepath) {
    filepath = `${location}/.inventorrc`
  }
  if (path.basename(filepath).lastIndexOf('.') !== 0 && !filepath.endsWith('.json')) {
    throw new Error('Only json file support save.')
  }
  await writeFile(filepath, jsonData)
}
