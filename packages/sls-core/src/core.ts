/**
 * core logic
 */
import { ApiService } from './api.service.js'
import { InstanceService } from './instance.service.js'

export interface SlsConfig {
  slsPath: string
  appId: string
  secretId: string
  secretKey: string
  token?: string
}

export interface SlsOptions {
  debug?: boolean
  force?: boolean
  pollTimeout?: number
  pollInterval?: number
}

export class Sls {
  private apiService: ApiService
  private instanceService: InstanceService
  private options: Required<SlsOptions>

  constructor(private readonly config: SlsConfig, options: SlsOptions = {}) {
    this.apiService = new ApiService(config)
    this.instanceService = new InstanceService(this.apiService, config.slsPath)
    this.options = {
      debug: options?.debug ?? false,
      force: options?.force ?? false,
      pollInterval: options?.pollInterval ?? 200,
      pollTimeout: options?.pollTimeout ?? 300 * 1000,
    }
  }

  async deploy() {
    const result = await this.instanceService.run('deploy')
    console.log(JSON.stringify(result, null, 2))
  }

  async remove() {
    console.log('remove...')
  }

  async info() {
    const instances = await this.instanceService.resolve('deploy')
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
