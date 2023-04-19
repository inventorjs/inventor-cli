import path from 'node:path'
import { config as configEnv } from 'dotenv'
import { SlsService, util, type ReportStatus } from '@inventorjs/sls-core'
import { env } from '@inventorjs/cli-core'

interface Ora {
  text: string
  prefixText: string
}

export function getSls(basePath: string) {
  const slsPath = path.resolve(process.cwd(), basePath as string)
  configEnv({
    path: path.resolve(env.pwd(), '.env'),
  })
  const {
    TENCENT_SECRET_ID = '',
    TENCENT_SECRET_KEY = '',
    TENCENT_TOKEN = '',
  } = process.env

  if (!TENCENT_SECRET_ID && !TENCENT_SECRET_KEY) {
    throw new Error(
      '"TENCENT_APP_ID" "TENCENT_SECRET_ID" "TENCENT_SECRET_KEY" variables is required in .env file!',
    )
  }

  const sls = new SlsService({
    secretId: TENCENT_SECRET_ID,
    secretKey: TENCENT_SECRET_KEY,
    token: TENCENT_TOKEN,
    slsPath,
  })

  return sls
}

export function getOptions(options: string[] = []) {
  const allOptions = [
    {
      name: 'stage',
      flags: '-s, --stage [stage]',
      description: '执行环境名称，默认使用配置环境',
    },
    {
      name: 'targets',
      flags: '-t, --targets [targets...]',
      description: '指定要部署的组件配置目录名称',
    },
    {
      name: 'force',
      flags: '-f, --force',
      description: '是否强制部署，跳过缓存和校验',
    },
    {
      name: 'path',
      flags: '-p, --path [path]',
      description: 'serverless 配置根目录',
      defaultValue: '.serverless',
    },
    {
      name: 'period',
      flags: '--period',
      description: '拉取日志时间段(单位秒)',
      defaultValue: '600',
    },
    {
      name: 'updateConfig',
      flags: '--update-config',
      description: '只更新应用配置',
    },
    { name: 'json', flags: '--json', description: '以 JSON 格式输出结果' },
  ]
  const realOptions = allOptions
    .filter((option) => options.includes(option.name))
    .map((option) => {
      const { name, ...realOption } = option
      return realOption
    })
  return realOptions
}

export async function reportStatus(
  loading: Ora,
  statusData: ReportStatus,
  action: string,
) {
  const { statusText, point, duration, instance } = statusData
  let prefixText = ''
  if (instance) {
    prefixText = `${instance.app} > ${instance.stage} > ${instance.name}(${action})`
  }
  let text = statusText
  if (point === 'end') {
    text += `完成[cost: ${duration}ms]`
  }
  loading.prefixText = prefixText
  loading.text = text
  if (point === 'end') {
    await util.sleep(1000)
  }
  if (action === 'dev') {
    loading.text = '远程开发监听中'
  }
  if (action === 'log') {
    loading.text = '远程日志监听中'
  }
}
