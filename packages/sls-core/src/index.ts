/**
 * serverless core
 */
import { resolveSlsTemplate } from './util.js'
import { ApiService } from './api-service.js'

const apiService = new ApiService({
  appId: '',
  secretId: '',
  secretKey: '',
})

async function run() {
  const template = await resolveSlsTemplate('')

  console.log(JSON.stringify(template, null, 2))

  // const data = await apiService.getCacheFileUrls({
  //   appName: 'scf-starter',
  //   stageName: 'dev',
  //   instanceName: 'scfdemo-1',
  // })
  if (!template) return

  const data = await apiService.runComponent({
    instance: template.instances[0],
    method: 'deploy',
  })

  console.log(data)
}

run()
