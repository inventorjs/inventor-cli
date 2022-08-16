/**
 * 配置读写模块
 * @author: sunkeysun
 */
import path from 'node:path'
import { readFile, writeFile } from 'node:fs/promises'
import toml from '@iarna/toml'
import { homedir, pwd } from './env.js'

export const filename = '.inventorrc.toml'

async function loadRc(rcPath: string) {
  const rcContent = await readFile(rcPath, 'utf8')
  let rcObj: Record<string, unknown> = {}
  try {
    rcObj = toml.parse(rcContent)
    return rcObj
  } catch (err) {
    console.log(err)
    return rcObj
  }
}

async function saveRc(rcPath: string, rcContent: Record<string, unknown>) {
  const rcStr = toml.stringify(rcContent as any)
  await writeFile(rcPath, rcStr)
}

export async function getLocal(key?: string) {
  const rcPath = path.resolve(pwd(), filename)
  try {
    const config = await loadRc(rcPath)
    if (key) {
      return config?.[key]
    }
    return config
  } catch (err) {
    return null
  }
}

export async function setLocal(key: string, data: unknown) {
  const rcPath = path.resolve(pwd(), filename)
  const config = await getLocal() as Record<string, unknown>
  config[key] = data
  await saveRc(rcPath, config)  
}

export async function getGlobal(key?: string) {
  const rcPath = path.resolve(homedir(), filename)
  try {
    const { default: config } = await import(rcPath)
    if (key) {
      return config?.key
    }
    return config
  } catch (err) {
    console.warn(`${rcPath} not exists!`)
    return null
  }  
}

export async function setGlobal(key: string, data: unknown) {
  const rcPath = path.resolve(homedir(), filename)
  const config = await getLocal() as Record<string, unknown>
  config[key] = data
  await saveRc(rcPath, config)   
}
