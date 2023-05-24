/**
 * action 入口
 * @author: sunkeysun
 */
import { Action } from '@inventorjs/cli-core'
import { SlsService } from '@inventorjs/sls-core'
import { type Options, getOptions, getSls } from '../common.js'

const options = ['base', 'secretId', 'secretKey', 'token'] as const

type LoginOptions = Pick<Options, (typeof options)[number]>
export default class LoginAction extends Action {
  description = '登陆腾讯云账号，获取临时登陆凭证'
  options = getOptions(options as unknown as string[])

  async run(_: string[], options: Required<LoginOptions>) {
    let expired
    let { base, secretId, secretKey, token } = options
    if (secretId && secretKey) {
      const sls = new SlsService({
        ...options,
        slsPath: base,
      })
      await sls.checkLogin()
    } else {
      const sls = getSls(base)
      const result = await sls.login()
      secretId = result.secret_id
      secretKey = result.secret_key
      token = result.token
      expired = result.expired
      if (!secretId || !secretKey || !token) {
        return this.log.error('登陆失败(未获取到有效凭证)')
      }
      if (Date.now() > expired * 1000) {
        return this.log.error('登陆凭证已过期，请重新登陆')
      }
    }
    await this.loadingTask(
      this.util.updateEnvFile('./.env', {
        TENCENT_SECRET_ID: secretId,
        TENCENT_SECRET_KEY: secretKey,
        TENCENT_TOKEN: token,
      }),
      '写入临时登陆凭证',
    )
    if (expired) {
      this.log.success(
        `当前登陆凭证有效期至: ${this.util.dateFormat(expired * 1000)}`,
      )
    } else {
      this.log.success('腾讯云 登陆成功')
    }
  }
}
