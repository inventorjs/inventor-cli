/**
 * util
 */
import fs from 'node:fs/promises'
import crypto from 'node:crypto'

export function md5sum(payload: Buffer | string) {
  return crypto.createHash('md5').update(payload).digest('hex')
}

export async function isFile(filePath: string) {
  try {
    return (await fs.stat(filePath)).isFile()
  } catch (err) {
    return false
  }
}

export function isObject(data: unknown) {
  return data && typeof data === 'object'
}

export function getStageRegion(stage = 'prod') {
  return stage === 'dev' ? 'ap-shanghai' : 'ap-guangzhou'
}
