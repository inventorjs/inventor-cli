import path from 'node:path'
import { config as configEnv } from 'dotenv'
import {
  SlsService,
  util,
  type ReportStatus,
  type ResultInstance,
  type ResultInstanceError,
} from '@inventorjs/sls-core'
import { env, log } from '@inventorjs/cli-core'

interface Ora {
  text: string
  prefixText: string
}

export interface BaseOptions {
  stage?: string
  targets?: string[]
  base?: string
  json?: boolean
  verbose?: boolean
  pollTimeout?: string
  pollInterval?: string
}

export interface Options extends BaseOptions {
  force?: boolean
  logsPeriod?: string
  logsInterval?: string
  logsQuery?: string
  updateConfig?: boolean
  updateCode?: boolean
  followSymbolicLinks?: boolean
}

const defaultBase = '.serverless'

export function getSls(basePath = defaultBase) {
  const slsPath = path.resolve(process.cwd(), basePath as string)
  configEnv({
    path: path.resolve(env.pwd(), '.env'),
  })
  const {
    TENCENT_SECRET_ID = '',
    TENCENT_SECRET_KEY = '',
    TENCENT_TOKEN = '',
    SERVERLESS_TENCENT_NET_TYPE,
  } = process.env

  if (!TENCENT_SECRET_ID && !TENCENT_SECRET_KEY) {
    throw new Error(
      '"TENCENT_SECRET_ID" "TENCENT_SECRET_KEY" variables is required in .env file!',
    )
  }

  const sls = new SlsService({
    secretId: TENCENT_SECRET_ID,
    secretKey: TENCENT_SECRET_KEY,
    token: TENCENT_TOKEN,
    netType: SERVERLESS_TENCENT_NET_TYPE,
    slsPath,
  })

  return sls
}

export function getOptions(options: string[] = []) {
  const baseOptions = [
    'stage',
    'targets',
    'base',
    'json',
    'verbose',
    'pollTimeout',
    'pollInterval',
  ]
  const allOptions = [
    {
      name: 'stage',
      flags: '-s, --stage [stage]',
      description: '执行环境名称，默认使用配置环境',
    },
    {
      name: 'targets',
      flags: '-t, --targets [targets...]',
      description: '指定要部署组件配置目录, 默认全部',
    },
    {
      name: 'base',
      flags: '-b, --base [base]',
      description: 'serverless 配置根目录',
      defaultValue: defaultBase,
    },
    {
      name: 'force',
      flags: '-f, --force',
      description: '强制部署，跳过缓存和校验',
    },
    {
      name: 'pollTimeout',
      flags: '--poll-timeout [pollTimeout]',
      description: '实例状态轮询超时时间(单位ms)',
      defaultValue: String(600 * 1000),
    },
    {
      name: 'pollInterval',
      flags: '--poll-interval [pollInterval]',
      description: '实例状态轮询周期(单位ms)',
      defaultValue: String(200),
    },
    {
      name: 'logsPeriod',
      flags: '--logs-period [logsPeriod]',
      description: '拉取日志时间段(单位ms)',
      defaultValue: String(60 * 1000),
    },
    {
      name: 'logsInterval',
      flags: '--logs-interval [logsInterval]',
      description: '实时日志轮询周期(单位ms)',
      defaultValue: String(1000),
    },
    {
      name: 'logsQuery',
      flags: '--logs-query [logsQuery]',
      description: '实时日志过滤条件',
      defaultValue: '*',
    },
    {
      name: 'followSymbolicLinks',
      flags: '--follow-symbolic-links',
      description: '解析软链接为实际文件',
    },
    {
      name: 'updateConfig',
      flags: '--update-config',
      description: '只更新应用配置',
    },
    {
      name: 'updateCode',
      flags: '--update-code',
      description: '只更新源代码文件',
    },
    {
      name: 'json',
      flags: '--json',
      description: '以 JSON 格式输出结果',
    },
    {
      name: 'verbose',
      flags: '--verbose',
      description: '输出详细实例信息',
    },
  ]
  const includeOptions = baseOptions.concat(options)
  const realOptions = allOptions
    .filter((option) => includeOptions.includes(option.name))
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
  let color: keyof typeof log.color = 'cyan'
  if (action === 'remove') {
    color = 'red'
  } else if (action === 'deploy') {
    color = 'green'
  }
  if (instance) {
    prefixText = `${instance.app} > ${instance.stage} > ${
      instance.name
    }(${log.color[color](action)})`
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
  if (action === 'logs') {
    loading.text = '远程日志监听中'
  }
}

function getOutput(instance: ResultInstance | ResultInstanceError) {
  const instanceError = instance as ResultInstanceError
  const resultInstance = instance as ResultInstance
  if (instanceError.$error && instanceError.$instance) {
    return {
      instance: instanceError.$instance,
      error: log.color.red(instanceError.$error.message),
    }
  }
  const statusColor: keyof typeof log.color = ['inactive', 'error'].includes(
    resultInstance.instanceStatus,
  )
    ? 'red'
    : 'cyan'
  const output = {
    appName: resultInstance.appName,
    stageName: resultInstance.stageName,
    instanceName: resultInstance.instanceName,
    instanceStatus: log.color[statusColor](resultInstance.instanceStatus),
  }
  if (['active', 'error'].includes(resultInstance.instanceStatus)) {
    Object.assign(output, {
      componentName: resultInstance.componentName,
      outputs: resultInstance.outputs,
    })
  }
  if (resultInstance.instanceStatus === 'error') {
    Object.assign(output, {
      deploymentError: log.color.red(resultInstance.deploymentError),
    })
  }
  return output
}

export function outputResults(
  results: Array<ResultInstance | ResultInstanceError>,
  options: BaseOptions = {},
) {
  if (options.json) {
    if (options.verbose) {
      log.clear()
      log.raw(JSON.stringify(results))
    } else {
      log.raw(JSON.stringify(results.map((instance) => getOutput(instance))))
    }
  } else {
    results.forEach((instance, index) => {
      const instanceError = instance as ResultInstanceError
      let logFun = log.info
      if (instanceError.$error) {
        logFun = log.error
      }
      logFun('='.repeat(60) + `[${index + 1}/${results.length}]`)
      if (options.verbose) {
        log.prettyJson(instance)
      } else {
        log.prettyJson(getOutput(instance))
      }
    })
  }
  if (!options.json) {
    let successCount = 0
    let errorCount = 0
    results.forEach((instance) => {
      const instanceError = instance as ResultInstanceError
      const resultInstance = instance as ResultInstance
      if (resultInstance.instanceStatus === 'error' || instanceError.$error) {
        errorCount += 1
      } else {
        successCount += 1
      }
    })

    log.raw(
      `${'='.repeat(30)}[ total: ${results.length}, ${log.color.green(
        `success: ${successCount}`,
      )}, ${log.color.red(`error: ${errorCount}`)} ]${'='.repeat(30)}`,
    )
  }
}
