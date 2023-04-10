/**
 * api 封装
 */
import ServerlessUtils from '@serverless/utils-china'
import { v4 as uuid } from 'uuid'
import { SlsInstance, SdkInstance } from './types.js'

const { Serverless } = ServerlessUtils

export interface ApiServiceParams {
  appId: string
  secretId: string
  secretKey: string
  token?: string
}

export interface GetCacheFileUrlsParams {
  appName: string
  stageName: string
  instanceName: string
}

export interface RunComponentParams {
  instance: SlsInstance
  method: 'deploy' | 'remove'
}

export class ApiService {
  constructor(private readonly config: ApiServiceParams) { }

  get sdk() {
    const { appId, secretId, secretKey, token } = this.config
    return new Serverless({
      appid: appId,
      secret_id: secretId,
      secret_key: secretKey,
      options: {
        token,
        traceId: uuid(),
      },
    })
  }

  private processSdkResponse(response: { RequestId: string; Body: string }) {
    const requestId = response.RequestId
    const body = JSON.parse(response.Body)
    const data = JSON.parse(body.body)
    return {
      RequestId: requestId,
      Response: data,
    }
  }

  private transformSdkInstance(instance: SlsInstance) {
    const sdkInstance = Object.entries(instance).reduce<SdkInstance>(
      (result, pair) => {
        const [key, val] = pair
        if (key === 'app') {
          return {
            ...result,
            appName: val,
          }
        }
        if (key === 'stage') {
          return {
            ...result,
            stageName: val,
          }
        }
        if (key === 'name') {
          return {
            ...result,
            instanceName: val,
          }
        }
        if (key === 'component') {
          const [componentName, componentVersion = ''] = val.split('@')
          return {
            ...result,
            componentName,
            componentVersion,
          }
        }
        if (['inputs'].includes(key)) {
          return { ...result, [key]: val }
        }
        return result
      },
      { orgName: this.config.appId } as SdkInstance,
    )

    return sdkInstance
  }

  async getCacheFileUrls({
    appName,
    stageName,
    instanceName,
  }: GetCacheFileUrlsParams) {
    const response = await this.sdk.getCacheFileUrls({
      orgUid: this.config.appId,
      appName,
      stageName,
      instanceName,
    })
    return this.processSdkResponse(response)
  }

  async runComponent({ instance, method }: RunComponentParams) {
    const response = await this.sdk.runComponent({
      instance: this.transformSdkInstance(instance),
      method,
    })
    return this.processSdkResponse(response)
  }

  async getInstance({ instance }: Pick<RunComponentParams, 'instance'>) {
    const response = await this.sdk.getInstance({
      instance: this.transformSdkInstance(instance),
    })
    return this.processSdkResponse(response)
  }
}
