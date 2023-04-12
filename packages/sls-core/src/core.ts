/**
 * core logic
 */
import type { SdkInstance, SlsAction, SlsInstance } from './types/index.js'

import { ApiService } from './api.service.js'
import { InstanceService } from './instance.service.js'
import { sleep } from './util.js'

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

  private async resloveInstances(action: SlsAction) {
    const instances = await this.instanceService.resolve(action)
    if (!instances?.length) {
      throw new Error(`there is no instances at "${this.config.slsPath}"`)
    }
    return instances
  }

  private async pollInstanceStatus(
    instance: SlsInstance,
  ): Promise<SdkInstance | null> {
    const { pollInterval, pollTimeout } = this.options
    const startTime = Date.now()
    do {
      const { Response } = await this.apiService.getInstance({ instance })
      const { instanceStatus } = Response.instance
      if (instanceStatus == 'deploying') {
        await sleep(pollInterval)
      } else {
        return Response.instance
      }
    } while (Date.now() - startTime < pollTimeout)
    return null
  }

  private async run(instance: SlsInstance) {
    const { instance: deployInstance, cacheOutdated } =
      await this.instanceService.processDeploySrc(instance)
    await this.apiService.runComponent({
      instance: deployInstance,
      method: 'deploy',
      options: {
        cacheOutdated,
      },
    })
    const result = await this.pollInstanceStatus(instance)
    return result
  }

  async deploy() {
    const action = 'deploy'
    const instances = await this.resloveInstances(action)

    for (const instance of instances) {
      const instanceResult = await this.run(instance)
      console.log(JSON.stringify(instanceResult, null, 2))
    }
  }

  async updateFunctionCode({ name }: { name: string }) {
    const action = 'deploy'
    const instances = await this.resloveInstances(action)
    const instance = instances?.find((instance) => instance.name === name)
    console.log(instance)
  }

  async remove() {
    console.log('remove...')
  }

  async info() {
    const action = 'info'
    const instances = await this.instanceService.resolve(action)
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
