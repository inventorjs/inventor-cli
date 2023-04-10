export interface SlsBaseInfo {
  org: string
  app: string
  stage: string
}

export interface SlsInstance extends SlsBaseInfo {
  component: string
  name: string
  inputs: Record<string, unknown>
  $deps: string[]
}

export interface SdkInstance extends Pick<SlsInstance, 'inputs'> {
  orgName: string
  appName: string
  stageName: string
  componentName: string
  componentVersion?: string
}

export interface SlsTemplate extends SlsBaseInfo {
  instances: SlsInstance[]
}
