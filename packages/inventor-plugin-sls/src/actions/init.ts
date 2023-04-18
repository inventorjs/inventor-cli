/**
 * action 入口
 * @author: sunkeysun
 */
import { Action } from '@inventorjs/cli-core'

export default class InitAction extends Action {
  description = '通过模版初始化 serverless 项目'

  async run() {
    const anwsers = await this.prompt([
      {
        name: 'name',
        type: 'list',
        message: '请选择应用模版类型',
        choices: [
          { value: 'default', name: 'default[scf + layer + apigateway + cls]' },
        ],
      },
      {
        name: 'appName',
        type: 'input',
        message: '请输入应用名称',
        validate: (value) =>
          !this.regex.slsAppName.test(value)
            ? `请输入合法的 serverless 应用名称(${this.regex.slsAppName})`
            : true,
      },
      {
        name: 'stageName',
        type: 'input',
        message: '请输入环境名称',
        default: 'dev',
        validate: (value) =>
          !this.regex.slsStageName.test(value)
            ? `请输入合法的 serverless 环境名称(${this.regex.slsStageName})`
            : true,
      },
    ])

    const { name, appName, stageName } = anwsers

    await this.renderTemplate(name, '.', {
      data: {
        appName,
        stageName,
      },
    })
    this.logInitCmd({
      cmd: 'inventor sls deploy'
    })
  }
}
