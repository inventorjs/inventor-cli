/**
 * core logic
 */
import path from 'node:path'
import fs from 'node:fs/promises'
import { globby } from 'globby'
import JSZip from 'jszip'
import axios from 'axios'
import { ApiService } from './api-service.js'
import { SlsAction, SlsInstance, SlsSrc, SlsSrcCos, SlsSrcEx } from './types.js'
import { resolveSlsInstances } from './util.js'

export interface SlsParams {
  slsPath: string
  appId: string
  secretId: string
  secretKey: string
  token?: string
}

export class Sls {
  private apiService: ApiService
  constructor(private readonly config: SlsParams) {
    this.apiService = new ApiService(config)
  }

  private async processDeployInstance(
    instance: SlsInstance,
    action: SlsAction,
  ) {
    if (action === 'deploy') {
      const src = instance.inputs.src
      if (src) {
        const srcEx = src as SlsSrcEx
        const srcCos = src as SlsSrcCos
        if (typeof src === 'string' || typeof srcEx?.src === 'string') {
          // from local files
          const zip = new JSZip()
          let realSrc = src as string
          const exclude = srcEx?.exclude ?? []
          if (typeof srcEx?.src === 'string') {
            realSrc = srcEx.src
          }
          const files = await globby(`${realSrc}/**/(.)?*`, {
            ignore: exclude,
          })
          for (const file of files) {
            zip.file(path.relative(realSrc, file), await fs.readFile(file))
          }
          zip.file('src.map', Buffer.from(''))
          const buffer = await zip.generateAsync({
            type: 'nodebuffer',
          })
          const { Response } = await this.apiService.getCacheFileUrls(instance)
          const { changesUploadUrl, srcDownloadUrl } = Response
          await axios.put(changesUploadUrl, buffer)
          instance.inputs.src = srcDownloadUrl
        } else if (
          typeof srcCos.bucket === 'string' &&
          typeof srcCos.object === 'string'
        ) {
          // from cos object
          instance.inputs.srcOriginal = src
          delete instance.inputs.src
        }
      }
    }
    return instance
  }

  async deploy() {
    const action = 'deploy'
    const instances = await resolveSlsInstances(this.config.slsPath, action)
    if (!instances?.length) {
      throw new Error('there is no instances')
    }

    for (const instance of instances) {
      const deployInstance = await this.processDeployInstance(instance, action)
      await this.apiService.runComponent({
        instance: deployInstance,
        method: 'deploy',
        options: {
          cacheOutdated: true,
        },
      })
    }
  }

  async remove() {
    console.log('remove...')
  }

  async info() {
    const action = 'info'
    const instances = await resolveSlsInstances(this.config.slsPath, action)
    if (!instances?.length) {
      throw new Error('there is no instances')
    }

    for (const instance of instances) {
      const res = await this.apiService.getInstance({ instance })
      console.log(JSON.stringify(res, null, 2))
    }
  }

  async dev() {
    console.log('dev...')
  }
}
