export interface InstanceBaseInfo {
  org: string
  app: string
  stage: string
}

export interface Instance extends InstanceBaseInfo {
  component: string
  name: string
  inputs: {
    src?: InstanceSrc
    [k: string]: unknown
  }
  $deps: string[]
}

export interface TransInstance extends Pick<Instance, 'inputs'> {
  orgName: string
  appName: string
  stageName: string
  instanceName: string
  componentName: string
  componentVersion?: string
}

export type Action = 'deploy' | 'remove' | 'info' | 'dev'
export type InstanceSrc = string | InstanceSrcEx | InstanceSrcCos
export type InstanceSrcEx = {
  src: string
  exclude?: string[]
  include?: string[]
}
export type InstanceSrcCos = { bucket: string; object: string }

export type InstanceStatus = 'active' | 'inactive' | 'deploying' | 'error'
