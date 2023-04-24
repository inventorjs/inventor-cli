/**
 * util
 */
import type { Stats } from 'node:fs'

import fs from 'node:fs/promises'
import crypto from 'node:crypto'
import pLimit from 'p-limit'
import { filesize as filesizeLib } from 'filesize'

export interface FileStatsContent {
  stats: Stats
  path: string
  content: Buffer
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

export async function getFilesStatsContent(files: string[]) {
  const limit = pLimit(10000)
  const tasks = files.map((file) =>
    limit(async () => {
      const stats = await fs.lstat(file)
      let content: Buffer | null = null
      if (stats.isSymbolicLink()) {
        content = Buffer.from(await fs.readlink(file))
      } else if (stats.isFile()) {
        content = await fs.readFile(file)
      } else {
        return null
      }
      return { stats, content, path: file }
    }),
  )
  const results = (await Promise.all(tasks)).filter(
    (fileData) => !!fileData,
  ) as FileStatsContent[]
  return results
}

export async function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve('')
    }, ms)
  })
}

export function filesize(bytes: number) {
  return String(filesizeLib(bytes, { base: 2, standard: 'jedec' })).replace(/\s/g, '')
}
