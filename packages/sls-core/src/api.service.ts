/**
 * api
 */
import type { UpdateFunctionCodeRequest } from 'tencentcloud-sdk-nodejs/tencentcloud/services/scf/v20180416/scf_models.js'
import type { SearchLogRequest } from 'tencentcloud-sdk-nodejs/tencentcloud/services/cls/v20201016/cls_models.js'

import type { SlsInstance, SlsConfig, TransInstance } from './types/index.js'
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
  instance: TransInstance 
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
  Partial<Pick<TransInstance, 'orgName' | 'appName' | 'stageName' | 'instanceName' | 'componentName'>>
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

  async getCacheFileUrls(instance: TransInstance) {
    const { appName, stageName, instanceName } = instance
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
          instance,
          method,
          options,
        }),
      'sls:runComponent',
    )
    return this.processSlsResponse(response)
  }

  async getInstance(instance: TransInstance) {
    const slsClient = await this.getSlsClient()
    const response = await this.call(
      async () =>
        slsClient.getInstance(instance),
      'sls:getInstance',
    )
    return this.processSlsResponse(response)
  }

  async listInstances({
    orgName,
    appName,
    stageName,
    instanceName,
    componentName,
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
        if (appName) {
          isTrue &&= instance.appName === appName
        }
        if (stageName) {
          isTrue &&= instance.stageName === stageName
        }
        if (instanceName) {
          isTrue &&= instance.instanceName === instanceName
        }
        if (componentName) {
          isTrue &&= instance.componentName === componentName
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
