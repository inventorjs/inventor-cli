/**
 * util
 */
import type { Stats, Dirent } from 'node:fs'

import fs from 'node:fs/promises'
import crypto from 'node:crypto'
import pLimit from 'p-limit'
import { filesize as filesizeLib } from 'filesize'

export interface FileEntry {
  dirent: Dirent
  name: string
  path: string
  stats?: Stats
}

export interface FileEntryContent extends Omit<FileEntry, 'stats'> {
  content: Buffer
  stats: Stats
}

export interface FileStat {
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

export async function getFileStatMap(files: FileEntry[]) {
  const limit = pLimit(2048)
  const tasks = files.map((file) =>
    limit(async () => {
      let content: Buffer | null = null
      if (file.stats?.isSymbolicLink()) {
        content = Buffer.from(await fs.readlink(file.path))
      } else if (file.stats?.isFile()) {
        content = await fs.readFile(file.path)
      } else {
        return null
      }

      return { ...file, content }
    }),
  )
  const resultList = (await Promise.all(tasks)).filter(
    (file) => !!file,
  ) as FileEntryContent[]
  const resultMap = resultList.reduce<Record<string, FileEntryContent>>(
    (result, file) => ({
      ...result,
      [file.path]: file,
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
  return String(filesizeLib(bytes, { base: 2, standard: 'jedec' })).replace(
    /\s/g,
    '',
  )
}
