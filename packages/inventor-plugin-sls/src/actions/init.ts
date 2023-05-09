/**
 * action 入口
 * @author: sunkeysun
 */
import path from 'node:path'
import { Action } from '@inventorjs/cli-core'

const tplList = [
  {
    value: 'nodejs-koa',
    name: '基础 nodejs koa 应用(云函数+层+网关+日志)',
    helloworld: 'Hello, Inventorjs * Koa!',
  },
  {
    value: 'nodejs-nest',
    name: '基础 nodejs nest 应用(云函数+层+网关+日志)',
    helloworld: 'Hello, Inventorjs * Nest!',
  },
]
export default class InitAction extends Action {
  description = '通过模版初始化 serverless 项目'
  options = [
    {
      name: 'config',
      flags: '--config',
      description: '只初始化 serverless 配置',
    },
  ]

  async run(_: string[], options: { config: boolean }) {
    const anwsers = await this.prompt([
      {
        name: 'tplName',
        type: 'list',
        message: '请选择应用模版类型',
        choices: tplList,
      },
      {
        name: 'orgName',
        type: 'input',
        message: '请输入团队名称(默认为 账号AppId)',
        validate: (value) =>
          value && !this.regex.slsOrgName.test(value)
            ? `请输入合法的 serverless 团队名称(${this.regex.slsOrgName})`
            : true,
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

    const { tplName, orgName, appName, stageName } = anwsers
    const { config } = options
    const dirName = config ? '.' : appName

    const tplItem = tplList.find((tpl) => tpl.name === tplName)
    const helloworld = tplItem?.helloworld

    await this.renderTemplate(tplName, dirName, {
      data: {
        orgName,
        appName,
        stageName,
        helloworld,
      },
      includes: config ? ['.serverless/**/*'] : undefined,
    })

    if (!config) {
      const cwd = path.resolve(this.pwd, dirName)
      await this.runTaskContext(
        async () => {
          await this.install()
        },
        { cwd },
      )
    }

    this.logInitCmd({
      dirName,
      cmd: 'pnpm dev\ninventor sls login\ninventor sls deploy\ninventor sls dev',
    })
  }
}
