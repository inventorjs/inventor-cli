import path from 'node:path'
import { config as loadEnv } from 'dotenv'
import {
  SlsService,
  util,
  type ReportStatus,
  type ResultInstance,
  type ResultInstanceError,
} from '@inventorjs/sls-core'
import { env, log, type Loading } from '@inventorjs/cli-core'

export interface Options {
  stage?: string
  json?: boolean
  detail?: boolean
  base?: string
  targets?: string[]
  force?: boolean
  inputs?: string[]
  logsPeriod?: string
  logsInterval?: string
  logsQuery?: string
  logsVerbose?: boolean
  updateConfig?: boolean
  updateCode?: boolean
  followSymbolicLinks?: boolean
  pollTimeout?: string
  pollInterval?: string
  org?: string
  names?: string[]
  apps?: string[]
  stages?: string[]
  components?: string[]
  secretId?: string
  secretKey?: string
  token?: string
}

const defaultBase = '.serverless'

export function getSls(basePath = defaultBase) {
  const slsPath = path.resolve(process.cwd(), basePath as string)
  loadEnv({
    path: path.resolve(env.pwd(), '.env'),
  })
  const {
    TENCENT_SECRET_ID = '',
    TENCENT_SECRET_KEY = '',
    TENCENT_TOKEN = '',
    SERVERLESS_TENCENT_NET_TYPE,
  } = process.env

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
  const allOptions = [
    {
      name: 'stage',
      flags: '-s, --stage [stage]',
      description: '执行环境名称，默认使用配置环境',
    },
    {
      name: 'org',
      flags: '-o, --org [org]',
      description: '团队名称, 默认为账号AppId',
    },
    {
      name: 'name',
      flags: '-n, --names [name...]',
      description: '实例名称',
    },
    {
      name: 'apps',
      flags: '-a, --apps [app...]',
      description: '应用名称',
    },
    {
      name: 'stages',
      flags: '-s, --stages [stages...]',
      description: '环境名称',
    },
    {
      name: 'components',
      flags: '-c, --components [component...]',
      description: '组件名称',
    },
    {
      name: 'targets',
      flags: '-t, --targets [targets...]',
      description: '指定要部署组件配置目录, 默认全部',
    },
    {
      name: 'inputs',
      flags: '-i, --inputs [inputs...]',
      description: '修改组件实例 inputs 参数',
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
      name: 'logsClean',
      flags: '--logs-verbose',
      description: '实时详细日志',
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
      name: 'detail',
      flags: '--detail',
      description: '输出详细实例信息',
    },
    {
      name: 'secretId',
      flags: '--secret-id [secretId]',
      description: 'API SecretID',
    },
    {
      name: 'secretKey',
      flags: '--secret-key [secretKey]',
      description: 'API SecretKey',
    },
    {
      name: 'token',
      flags: '--token [token]',
      description: '临时密钥 token',
    },
  ]
  const includeOptions = options
  const realOptions = allOptions
    .filter((option) => includeOptions.includes(option.name))
    .map((option) => {
      const { name, ...realOption } = option
      return realOption
    })
  return realOptions
}

export async function reportStatus(
  loading: Loading,
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
    prefixText = `${instance.app} > ${instance.stage} > ${instance.name
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
    loading.text = '云函数远程开发监听中'
  }
  if (action === 'logs') {
    loading.text = '云函数远程日志监听中'
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
    updatedAt: resultInstance.updatedAt,
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
  options: Options = {},
) {
  if (options.json) {
    if (options.detail) {
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
      if (options.detail) {
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

export function processInputs(inputs?: string[]) {
  let realInputs: Record<string, string> = {}
  if (inputs && inputs?.length > 0) {
    realInputs = inputs.reduce<Record<string, string>>(
      (result, inputItem) => {
        const [key, val] = inputItem.split('=')
        return {
          ...result,
          [key]: val,
        }
      },
      {},
    )
  }
  return realInputs
}

export function processOptions(options: Options) {
  const {
    inputs,
    updateConfig,
    updateCode,
    pollTimeout,
    pollInterval,
    logsPeriod,
    logsInterval,
    logsQuery,
    logsVerbose,
    ...restOptions
  } = options
  let realOptions = restOptions

  if (inputs) {
    Object.assign(realOptions, { inputs: processInputs })
  }
  if (updateCode || updateConfig) {
    Object.assign(realOptions, {
      deployType: updateCode ? 'code' : updateConfig ? 'config' : 'all',
    })
  }
  if (pollInterval) {
    Object.assign(realOptions, { pollInterval: + pollInterval })
  }
  if (pollTimeout) {
    Object.assign(realOptions, { pollTimeout: + pollTimeout })
  }

  if (logsPeriod || logsInterval || logsQuery || logsVerbose) {
    Object.assign(realOptions, { devServer: {
      logsInterval: +logsInterval!,
      logsPeriod: +logsPeriod!,
      logsVerbose,
      logsQuery,
    }})
  }
    
  return realOptions
}
