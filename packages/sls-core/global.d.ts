declare module '@serverless/utils-china' {
  interface ConstructorParams {
    appid: string
    secret_id: string
    secret_key: string
    options: {
      token?: string
      traceId?: string
    }
  }

  interface Response {
    RequestId: string
    Body: string
  }

  class Serverless {
    constructor(private readonly params: ConstructorParams) {
      //
    }
    async getCacheFileUrls(params: unknown): Promise<Response>
    async runComponent(params: unknown): Promise<Response>
    async getInstance(params: unknown): Promise<Response>
    async listInstances(params: unknown): Promise<Response>
  }
}
