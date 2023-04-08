declare module '@serverless/utils-china' {

  interface ConstructorParams {
    appid: string
    secretId: string
    secretKey: string
    options: {
      region: string
      token?: string
      sdkAgent?: string
      traceId?: string
    }
  }

  class Serverless {
    constructor(params: ConstructorParams) { }
  }
}
