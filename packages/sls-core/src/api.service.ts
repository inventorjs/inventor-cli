/**
 * api
 */
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

export type ListInstancesParams = Partial<
  Partial<Pick<SlsInstance, 'app' | 'stage' | 'name' | 'component'>>
>

export class ApiService {
  private appId: string = ''

  constructor(private readonly config: SlsConfig) {}

  private getEndPoint(clientType: string) {
    const endParts = [clientType]
    if (process.env.SERVERLESS_TENCENT_NET_TYPE === 'inner') {
      endParts.push('internal')
    }
    endParts.push('tencentcloudapi.com')
    const endpoint = endParts.join('.')
    return endpoint
  }

  async getSlsClient() {
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

  getScfClient(region: string) {
    return new ScfClient(this.getCloudSdkConfig('scf', region))
  }

  getClsClient(region: string) {
    return new ClsClient(this.getCloudSdkConfig('cls', region))
  }

  getCamClient() {
    return new CamClient(this.getCloudSdkConfig('cam'))
  }

  async getAppId() {
    if (!this.appId) {
      const { AppId } = await this.getCamClient().GetUserAppId()
      this.appId = String(AppId)
    }
    return this.appId
  }

  private processResponse(response: { RequestId: string; Body: string }) {
    const requestId = response.RequestId
    const body = JSON.parse(response.Body)
    const data = JSON.parse(body.body)
    return {
      RequestId: requestId,
      Response: data,
    }
  }

  private async processInstance(instance: SlsInstance) {
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
        orgName: await this.getAppId(),
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
    const { appName, stageName, instanceName } = await this.processInstance(
      instance,
    )
    const slsClient = await this.getSlsClient()
    const response = await slsClient.getCacheFileUrls({
      orgUid: this.appId,
      appName,
      stageName,
      instanceName,
    })
    return this.processResponse(response)
  }

  async runComponent({ instance, method, options }: RunComponentParams) {
    const slsClient = await this.getSlsClient()
    const response = await slsClient.runComponent({
      instance: await this.processInstance(instance),
      method,
      options,
    })
    return this.processResponse(response)
  }

  async getInstance(instance: SlsInstance) {
    const slsClient = await this.getSlsClient()
    const response = await slsClient.getInstance(
      await this.processInstance(instance),
    )
    return this.processResponse(response)
  }

  async listInstances({
    app,
    stage,
    name,
    component,
  }: ListInstancesParams = {}) {
    const slsClient = await this.getSlsClient()
    const appId = await this.getAppId()
    const response = await slsClient.listInstances({
      orgName: appId,
      orgUid: appId,
    })
    const res = this.processResponse(response)
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
