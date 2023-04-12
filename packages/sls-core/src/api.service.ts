/**
 * api 封装
 */
import ServerlessUtils from '@serverless/utils-china'
import { v4 as uuid } from 'uuid'
import { SlsInstance, TransInstance } from './types/index.js'

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
  options: {
    cacheOutdated?: boolean // 缓存是否过期：增量部署
    force?: boolean // 强制全量部署
  }
}

export type ListInstancesParams = Partial<
  Pick<SlsInstance, 'app' | 'stage' | 'name' | 'component'>
>

export class ApiService {
  constructor(private readonly config: ApiServiceParams) {}

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
    const sdkInstance = Object.entries(instance).reduce<TransInstance>(
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
          const [componentName, componentVersion = ''] = String(val).split('@')
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
      {
        orgName: this.config.appId,
        appName: '',
        stageName: '',
        componentName: '',
        instanceName: '',
        inputs: {},
      },
    )

    return sdkInstance
  }

  async getCacheFileUrls(instance: SlsInstance) {
    const { appName, stageName, instanceName } =
      this.transformSdkInstance(instance)
    const response = await this.sdk.getCacheFileUrls({
      orgUid: this.config.appId,
      appName,
      stageName,
      instanceName,
    })
    return this.processSdkResponse(response)
  }

  async runComponent({ instance, method, options }: RunComponentParams) {
    const response = await this.sdk.runComponent({
      instance: this.transformSdkInstance(instance),
      method,
      options,
    })
    return this.processSdkResponse(response)
  }

  async getInstance({ instance }: Pick<RunComponentParams, 'instance'>) {
    const response = await this.sdk.getInstance(
      this.transformSdkInstance(instance),
    )
    return this.processSdkResponse(response)
  }

  async listInstances({
    app,
    stage,
    name,
    component,
  }: ListInstancesParams = {}) {
    const response = await this.sdk.listInstances({
      orgName: this.config.appId,
      orgUid: this.config.appId,
    })
    const res = this.processSdkResponse(response)
    const { Response } = res
    const instances = Response?.instances?.filter?.(
      (instance: TransInstance) => {
        let isTrue = true
        if (app) {
          isTrue &&= instance.appName === app
        }
        if (stage) {
          isTrue &&= instance.stageName === stage
        }
        if (name) {
          isTrue &&= instance.instanceName === name
        }
        if (component) {
          isTrue &&= instance.componentName === component
        }
        return isTrue
      },
    )
    Response.instances = instances
    return res
  }
}
