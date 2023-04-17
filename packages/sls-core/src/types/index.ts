export interface SlsInstanceBaseInfo {
  org: string
  app: string
  stage: string
}

export interface SlsInstance extends SlsInstanceBaseInfo {
  component: string
  name: string
  inputs: {
    src?: SlsInstanceSrc
    [k: string]: unknown
  }
  $deps: string[]
  $path: string
  $src:
    | SlsInstanceSrcLocal
    | {
        src: null
        srcOriginal?: SlsInstanceSrcCos
      }
    | null
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

export interface ScfResultInstance extends ResultInstance {
  state: {
    function: {
      ClsTopicId: string
    }
  }
}

export type RunAction = 'deploy' | 'remove'

export interface RunOptions {
  force: boolean
  maxDeploySize: number
  pollTimeout: number
  pollInterval: number
  followSymbolicLinks: boolean
  resolveVar: 'all' | 'env'
  reportStatus: (d: ReportStatus) => void
  devServer: {
    logsPollInterval: number
    logsQuery: string
    logsPeriod: number
    updateDebounceTime: number
  },
  targets: string[]
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
