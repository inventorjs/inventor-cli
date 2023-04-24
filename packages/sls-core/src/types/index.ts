export interface SlsInstanceBaseInfo {
  org?: string
  app: string
  stage: string
}

export interface OriginInstance extends SlsInstanceBaseInfo {
  component: string
  name: string
  inputs: {
    src?: SlsInstanceSrc
    [k: string]: unknown
  }
  $path: string
}

export interface SlsInstance extends OriginInstance {
  $deps: string[]
  $src:
    | SlsInstanceSrcLocal
    | {
        src: null
        srcOriginal?: SlsInstanceSrcCos
      }
    | null
}

export interface MultiInstance extends SlsInstanceBaseInfo {
  instances: Record<string, SlsInstance>
  $path: string
}

export interface TransInstance extends Pick<SlsInstance, 'inputs'> {
  orgName: string
  appName: string
  stageName: string
  instanceName: string
  componentName: string
  componentVersion?: string
}

export interface ResultInstance extends TransInstance {
  instanceStatus: SlsInstanceStatus
  outputs: Record<string, unknown>
  inputs: Record<string, unknown>
  lastAction: string
  lastActionAt: number
  updatedAt: number
  state: Record<string, unknown>
  deploymentError: string
}

export interface ResultInstanceError {
  $instance: SlsInstance
  $error: Error
}

export interface ScfResultInstance extends ResultInstance {
  state: {
    function: {
      ClsTopicId: string
    }
  }
}

export interface MultiScfInstance extends SlsInstance {
  function: Record<string, {
    src: string
  }>
}

export type RunAction = 'deploy' | 'remove'

export interface RunOptions {
  force: boolean
  maxDeploySize: number
  pollTimeout: number
  pollInterval: number
  followSymbolicLinks: boolean
  resolveVar: 'all' | 'env'
  reportStatus: (d: ReportStatus) => Promise<void>
  deployType: 'config' | 'all' | 'code'
  devServer: {
    logsInterval: number
    logsQuery: string
    logsPeriod: number
    logWriter: (log: Record<string, unknown>) => void
    updateDebounceTime: number
  },
  targets: string[]
  stage?: string
}

export interface PartialRunOptions extends Partial<Omit<RunOptions, 'devServer'>> {
  devServer?: Partial<RunOptions['devServer']>
}

export interface ReportStatus {
  status: string
  statusText: string
  point: 'start' | 'end'
  duration?: number
  instance?: SlsInstance
}

export type SlsInstanceSrcLocal = {
  src: string
  exclude?: string[]
  include?: string[]
}
export type SlsInstanceSrcCos = { bucket: string; object: string }
export type SlsInstanceSrc = string | SlsInstanceSrcLocal | SlsInstanceSrcCos
export type SlsInstanceStatus =
  | 'active'
  | 'inactive'
  | 'deploying'
  | 'error'
  | 'removing'

export interface SlsConfig {
  slsPath: string
  secretId: string
  secretKey: string
  token?: string
  netType?: string
}
