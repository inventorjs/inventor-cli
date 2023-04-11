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
}

export interface TransInstance extends Pick<SlsInstance, 'inputs'> {
  orgName: string
  appName: string
  stageName: string
  instanceName: string
  componentName: string
  componentVersion?: string
}

export type Action = 'deploy' | 'remove' | 'info' | 'dev'
export type SlsInstanceSrc = string | SlsInstanceSrcEx | SlsInstanceSrcCos
export type SlsInstanceSrcEx = {
  src: string
  exclude?: string[]
  include?: string[]
}
export type SlsInstanceSrcCos = { bucket: string; object: string }

export type SlsInstanceStatus = 'active' | 'inactive' | 'deploying' | 'error'
