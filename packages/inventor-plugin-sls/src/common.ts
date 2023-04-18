import path from 'node:path'
import { config as configEnv } from 'dotenv'
import { SlsService, type ReportStatus } from '@inventorjs/sls-core'
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
    TENCENT_APP_ID = '',
    TENCENT_SECRET_ID = '',
    TENCENT_SECRET_KEY = '',
    TENCENT_TOKEN = '',
  } = process.env

  if (!TENCENT_APP_ID && !TENCENT_SECRET_ID && !TENCENT_SECRET_KEY) {
    throw new Error(
      '"TENCENT_APP_ID" "TENCENT_SECRET_ID" "TENCENT_SECRET_KEY" variables is required in .env file!',
    )
  }

  const sls = new SlsService({
    appId: TENCENT_APP_ID,
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
      flags: '-t, --targets [...targets]',
      description: '指定要部署的组件配置目录名称',
    },
    {
      name: 'force',
      flags: '-f, --force',
      description: '是否强制部署，跳过缓存和校验',
    },
    {
      name: 'path',
      flags: '-p, --path',
      description: 'serverless 配置根目录',
      defaultValue: '.serverless',
    },
    {
      name: 'updateConfig',
      flags: '--update-config',
      description: '只更新应用配置',
    },
    {
      name: 'updateSrc',
      flags: '--update-src',
      description: '只更新应用源代码[只支持scf]',
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

export function reportStatus(
  loading: Ora,
  statusData: ReportStatus,
  action = 'deploy',
) {
  if (statusData.instance) {
    const duration =
      statusData.point === 'end' ? `(${statusData.duration}ms)` : ''
    loading.prefixText = `实例[${statusData.instance?.name}${duration}]`
  }
  loading.text = statusData.statusText
  if (action === 'dev') {
    setTimeout(() => {
      loading.text = '远程开发监听中...'
    }, 1000)
  }
}
