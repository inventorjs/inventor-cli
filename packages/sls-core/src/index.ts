/**
 * serverless core
 */
import { resolveSlsTemplate, getStageRegion } from './util.js'
// import ServerlessUtils from '@serverless/utils-china'

async function run() {
  const template = await resolveSlsTemplate(
    '/Users/sunkeysun/Projects/Other/cli/packages/sls-core/.serverless',
  )

  console.log(JSON.stringify(template, null, 2))
}

run()

// const { Serverless } = ServerlessUtils

// export class Sls {
//   private sdk: Serverless

//   constructor(private readonly slsPath: string) {
//     const {
//       TENCENT_APP_ID: appid = '',
//       TENCENT_SECRET_ID: secretId = '',
//       TENCENT_SECRET_KEY: secretKey = '',
//       TENCENT_TOKEN: token = '',
//       SERVERLESS_PLATFORM_STAGE: stage,
//     } = process.env
//     const region = getStageRegion(stage)
//     this.sdk = new Serverless({
//       appid,
//       secretId,
//       secretKey,
//       options: {
//         region,
//         token,
//         sdkAgent: '@inventorjs/sls-core',
//         traceId: ''
//       }
//     })
//   }

//   async dev() { }
//   async deploy() {
//     const template = await resolveSlsTemplate(this.slsPath)
//     if (!template) {
//       console.log('没有实例')
//     }

//   }
//   async remove() { }
//   async info() { }
// }
