/**
 * core logic
 */
import { ApiService } from './api-service.js'
import { SlsInstance } from './instance.js'

export interface SlsParams {
  slsPath: string
  appId: string
  secretId: string
  secretKey: string
  token?: string
}

export interface DeployParams {
  debug?: boolean
  force?: boolean
  pollTimeout?: number
  pollInterval?: number
}

export class Sls {
  private apiService: ApiService
  constructor(private readonly config: SlsParams) {
    this.apiService = new ApiService(config)
  }

  async deploy(params: DeployParams) {
    const instance = new SlsInstance(this.apiService)
    const result = instance.deploy() 
    // const action = 'deploy'
    // const instances = await resolveSlsInstances(this.config.slsPath, action)
    // if (!instances?.length) {
    //   throw new Error('there is no instances')
    // }

    // for (const instance of instances) {
    //   const deployInstance = await processDeployInstance(instance, action)
    //   await this.apiService.runComponent({
    //     instance: deployInstance,
    //     method: 'deploy',
    //     options: {
    //       cacheOutdated: true,
    //     },
    //   })
    // }
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
