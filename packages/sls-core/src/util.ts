/**
 * util
 */
import type { Stats } from 'node:fs'

import fs from 'node:fs/promises'
import crypto from 'node:crypto'
import pLimit from 'p-limit'
import { filesize as filesizeLib } from 'filesize'

interface FileStat {
  stat: Stats
  content: Buffer
  file: string
}

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
  const tasks = files.map((file) =>
    limit(async () => {
      const stat = await fs.lstat(file)
      let content: Buffer | null = null
      if (stat.isSymbolicLink()) {
        content = Buffer.from(await fs.readlink(file))
      } else if (stat.isFile()) {
        content = await fs.readFile(file)
      } else {
        return null
      }
      return { stat, content, file }
    }),
  )
  const resultList = (await Promise.all(tasks)).filter(
    (fileData) => !!fileData,
  ) as FileStat[]
  const resultMap = resultList.reduce<Record<string, FileStat>>(
    (result, fileData) => ({
      ...result,
      [fileData.file]: fileData,
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

export function filesize(bytes: number) {
  return filesizeLib(bytes, { base: 2 })
}
