/**
 * util
 */
import type { Stats } from 'node:fs'

import fs from 'node:fs/promises'
import crypto from 'node:crypto'
import pLimit from 'p-limit'

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

export async function getFileStatMap(files: string[]) {
  const limit = pLimit(2048)
  const tasks = files.map((filePath) =>
    limit(async () => {
      const stat = await fs.lstat(filePath)
      let content: Buffer | null = null
      if (stat.isSymbolicLink()) {
        content = Buffer.from(await fs.readlink(filePath))
      } else {
        content = await fs.readFile(filePath)
      }
      return { stat, content }
    }),
  )
  const resultList = await Promise.all(tasks)
  const resultMap = resultList.reduce<
    Record<string, { content: Buffer; stat: Stats }>
  >(
    (result, fileData, index) => ({
      ...result,
      [files[index]]: fileData,
    }),
    {},
  )
  return resultMap
}

export async function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve('')
    }, ms)
  })
}
