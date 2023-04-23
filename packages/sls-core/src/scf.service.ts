/**
 * scf service
 */
import type { SlsConfig, SlsInstance, RunOptions } from './index.js';
import { ApiService } from './api.service.js';

export class ScfService {
  private apiService: ApiService

  constructor(private readonly confg: SlsConfig) {
    this.apiService = new ApiService(confg) 
  }

  async updateFunctionCode(scfInstance: SlsInstance, options: RunOptions) {
    const srcLocal = scfInstance.$src?.src
    const fileStatMap = await this.getSrcLocalFileStatMap(instance, options)

    if (!fileStatMap || !srcLocal) {
      throw new Error('there is no src files to zip')
    }
    const { zipBuffer } = await this.zipSrcLocalChanges(
      fileStatMap,
      {},
      srcLocal,
      instance,
      options,
    )

    await this.apiService.updateFunctionCode(
      {
        Namespace: (scfInstance.inputs.namespace ?? 'default') as string,
        FunctionName: scfInstance.inputs.name as string,
        ZipFile: zipBuffer.toString('base64'),
      },
      this.getRegion(instance),
    )
    return this.poll(instance, options)
  }

  async pollFunctionLogs(instance: SlsInstance, options: RunOptions) {
    const instanceResult = (await this.poll(
      instance,
      options,
    )) as ScfResultInstance
    if (!instanceResult) {
      return
    }
    const topicId = instanceResult.state.function.ClsTopicId
    let tailMd5 = ''

    interval(options.devServer.logsInterval).subscribe(async () => {
      const { Results } = await this.apiService.searchLog(
        {
          TopicId: topicId,
          From: Date.now() - options.devServer.logsPeriod,
          To: Date.now(),
          Sort: 'asc',
          Query: options.devServer.logsQuery,
        },
        this.getRegion(instance),
      )

      let results = Results?.map((item) => ({
        ...item,
        $md5: md5sum(item.LogJson),
      }))

      const md5Index = results?.findIndex((item) => item.$md5 === tailMd5) ?? -1
      if (results && md5Index > -1) {
        results = results.slice(md5Index + 1)
      }
      tailMd5 = results?.at(-1)?.$md5 ?? tailMd5
      results?.forEach((item) =>
        options.devServer.logWriter(JSON.parse(item.LogJson)),
      )
    })
  }  
}
