export interface SlsBaseInfo {
  org: string
  app: string
  stage: string
}

export interface SlsInstance extends SlsBaseInfo {
  component: string
  name: string
  inputs: {
    src?: any
    [k: string]: unknown
  }
  $deps: string[]
}

export interface SdkInstance extends Pick<SlsInstance, 'inputs'> {
  orgName: string
  appName: string
  stageName: string
  instanceName: string
  componentName: string
  componentVersion?: string
}

export interface SlsTemplate extends SlsBaseInfo {
  instances: SlsInstance[]
}

export type SlsAction = 'deploy' | 'remove' | 'info' | 'dev'
export type SlsSrc =
  | string
  | { src: string; exclude?: string[] }
  | { bucket: string; object: string }
export type InstanceStatus = 'active' | 'inactive' | 'deploying' | 'error'
