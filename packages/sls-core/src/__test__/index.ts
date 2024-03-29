/**
 * serverless core
 */
import path from 'node:path'
import { config as configEnv } from 'dotenv'
import { SlsService } from '../index.js'

configEnv()

async function run() {
  const {
    TENCENT_SECRET_ID = '',
    TENCENT_SECRET_KEY = '',
    TENCENT_TOKEN = '',
  } = process.env

  const sls = new SlsService({
    secretId: TENCENT_SECRET_ID,
    secretKey: TENCENT_SECRET_KEY,
    token: TENCENT_TOKEN,
    slsPath: path.resolve(process.cwd(), '.serverless'),
  })

  const result = await sls.dev({
    targets: ['scf'],
    async reportStatus(statusData) {
      console.log(statusData)
    },
  })
  console.log(JSON.stringify(result, null, 2))
}

run()
