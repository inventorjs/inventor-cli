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

export type RunAction = 'deploy' | 'remove'
export interface ReportStatus {
  value: string
  label: string
  point: 'start' | 'end'
  instances: SlsInstance[]
  context?: Record<string, unknown>
}

export type SlsInstanceSrcLocal = {
  src: string
  exclude?: string[]
  include?: string[]
}
export type SlsInstanceSrcCos = { bucket: string; object: string }
export type SlsInstanceSrc = string | SlsInstanceSrcLocal | SlsInstanceSrcCos
export type SlsInstanceStatus = 'active' | 'inactive' | 'deploying' | 'error'
