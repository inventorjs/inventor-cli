/**
 * serverless core
 */
import { Sls } from './core.js'

async function run() {
  const sls = new Sls({
    appId: '',
    secretId: '',
    secretKey: '',
    slsPath: '',
  })

  await sls.deploy()
  // await sls.info()
}

run()
