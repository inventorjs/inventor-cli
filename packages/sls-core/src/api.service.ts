/**
 * api
 */
import type { UpdateFunctionCodeRequest } from 'tencentcloud-sdk-nodejs/tencentcloud/services/scf/v20180416/scf_models.js'
import type { SearchLogRequest } from 'tencentcloud-sdk-nodejs/tencentcloud/services/cls/v20201016/cls_models.js'

import type { SlsInstance, TransInstance, SlsConfig } from './types/index.js'
import { cam, scf, cls } from 'tencentcloud-sdk-nodejs'
import ServerlessUtils from '@serverless/utils-china'
import { v4 as uuid } from 'uuid'

const ScfClient = scf.v20180416.Client
const ClsClient = cls.v20201016.Client
const CamClient = cam.v20190116.Client

const { Serverless } = ServerlessUtils

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

export interface SlsSdkResponse {
  RequestId: string
  Body: string
}

export type ListInstancesParams = Partial<
  Partial<Pick<SlsInstance, 'app' | 'stage' | 'name' | 'component'>>
>

export class ApiService {
  private appId: string = ''

  constructor(private readonly config: SlsConfig) {}

  private getEndPoint(clientType: string) {
    const endParts = [clientType]
    if (this.config.netType === 'inner') {
      endParts.push('internal')
    }
    endParts.push('tencentcloudapi.com')
    const endpoint = endParts.join('.')
    return endpoint
  }

  private async call<T = SlsSdkResponse>(callFun: () => Promise<T>, apiName: string) {
    try {
      return await callFun()
    } catch (err) {
      const error = err as Error & { code: string, requestId: string }
      let errDetail = error.code && error.requestId ? JSON.stringify({code: error.code, requestId: error.requestId }) : ''
      errDetail = errDetail ? `\n${errDetail}` : ''
      throw new Error(`[${apiName}]${error.message}${errDetail}`, { cause: error })
    }
  }

  private async getSlsClient() {
    const { secretId, secretKey, token } = this.config
    return new Serverless({
      appid: await this.getAppId(),
      secret_id: secretId,
      secret_key: secretKey,
      options: {
        token,
        traceId: uuid(),
      },
    })
  }

  private getCloudSdkConfig(sdkType: string, region = '') {
    return {
      credential: {
        secretId: this.config.secretId,
        secretKey: this.config.secretKey,
        token: this.config.token,
      },
      region,
      profile: {
        httpProfile: {
          endpoint: this.getEndPoint(sdkType),
        },
      },
    }
  }

  private getScfClient(region: string) {
    return new ScfClient(this.getCloudSdkConfig('scf', region))
  }

  private getClsClient(region: string) {
    return new ClsClient(this.getCloudSdkConfig('cls', region))
  }

  private getCamClient() {
    return new CamClient(this.getCloudSdkConfig('cam'))
  }

  async getAppId() {
    if (!this.appId) {
      const { AppId } = await this.call<{ AppId?: number }>(
        () => this.getCamClient().GetUserAppId(),
        'cam:GetUserAppId',
      )
      this.appId = String(AppId)
    }
    return this.appId
  }

  private processSlsResponse(response: SlsSdkResponse) {
    const requestId = response.RequestId
    const body = JSON.parse(response.Body)
    const data = JSON.parse(body.body)
    return {
      RequestId: requestId,
      Response: data,
    }
  }

  private async processSlsInstance(instance: SlsInstance) {
    const transInstance = Object.entries(instance).reduce<TransInstance>(
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
        orgName: 'sunkeysunorg',//await this.getAppId(),
        appName: '',
        stageName: '',
        componentName: '',
        instanceName: '',
        inputs: {},
      },
    )

    return transInstance
  }

  async getCacheFileUrls(instance: SlsInstance) {
    const { appName, stageName, instanceName } = await this.processSlsInstance(
      instance,
    )
    const slsClient = await this.getSlsClient()
    const response = await this.call(
      () =>
        slsClient.getCacheFileUrls({
          orgUid: this.appId,
          appName,
          stageName,
          instanceName,
        }),
      'sls:getCacheFileUrls',
    )
    return this.processSlsResponse(response)
  }

  async runComponent({ instance, method, options }: RunComponentParams) {
    const slsClient = await this.getSlsClient()
    const response = await this.call(
      async () =>
        slsClient.runComponent({
          instance: await this.processSlsInstance(instance),
          method,
          options,
        }),
      'sls:runComponent',
    )
    return this.processSlsResponse(response)
  }

  async getInstance(instance: SlsInstance) {
    const slsClient = await this.getSlsClient()
    const response = await this.call(
      async () =>
        slsClient.getInstance(await this.processSlsInstance(instance)),
      'sls:getInstance',
    )
    return this.processSlsResponse(response)
  }

  async listInstances({
    app,
    stage,
    name,
    component,
  }: ListInstancesParams = {}) {
    const slsClient = await this.getSlsClient()
    const appId = await this.getAppId()
    const response = await this.call(
      () =>
        slsClient.listInstances({
          orgName: appId,
          orgUid: appId,
        }),
      'sls:listInstances',
    )
    const res = this.processSlsResponse(response)
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

  async updateFunctionCode(params: UpdateFunctionCodeRequest, region: string) {
    return this.call(
      () => this.getScfClient(region).UpdateFunctionCode(params),
      'scf:UpdateFunctionCode',
    )
  }

  async searchLog(params: SearchLogRequest, region: string) {
    return this.call(
      () => this.getClsClient(region).SearchLog(params),
      'cls:SearchLog',
    )
  }
}
