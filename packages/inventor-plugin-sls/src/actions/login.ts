/**
 * action 入口
 * @author: sunkeysun
 */
import { Action } from '@inventorjs/cli-core'
import { getSls } from '../common.js'

export default class LoginAction extends Action {
  description = '登陆腾讯云账号，获取临时密钥'

  async run(_: string[]) {
    const sls = getSls('.serverless', true)
    const result = await sls.login()
    const { secret_id: secretId, secret_key: secretKey, token, expired } = result
    if (!secretId || !secretKey || !token) {
      return this.log.error('登陆失败(未获取到有效凭证)')
    }
    if (Date.now() > expired * 1000) {
      return this.log.error('登陆凭证已过期，请重新登陆')
    }
    await this.loadingTask(this.fs.writeFile('./.env', [
      `TENCENT_SECRET_ID=${secretId}`,
      `TENCENT_SECRET_KEY=${secretKey}`,
      `TENCENT_TOKEN=${token}`,
    ].join('\n')), '写入临时登陆凭证')
    this.log.success(`当前登陆凭证有效期至: ${this.util.dateFormat(expired * 1000)}`)
  }
}
