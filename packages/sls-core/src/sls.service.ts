/**
 * sls service
 */
import type {
  RunOptions,
  ResultInstance,
  SlsConfig,
  PartialRunOptions,
} from './types/index.js'

import chokidar from 'chokidar'
import { ApiService, type ListInstancesParams } from './api.service.js'
import { Observable, concatMap, debounceTime } from 'rxjs'
import { COMPONENT_SCF } from './constants.js'
import { InstanceService } from './instance.service.js'

export class SlsService {
  private apiService: ApiService
  private instanceService: InstanceService

  constructor(config: SlsConfig) {
    this.apiService = new ApiService(config)
    this.instanceService = new InstanceService(config)
  }

  private async getScfInstances(options: RunOptions) {
    const resolvedInstances = await this.instanceService.resolve(
      'deploy',
      options,
    )
    const scfInstances = resolvedInstances?.filter?.(
      (instance) => instance.component === COMPONENT_SCF,
    )
    if (!scfInstances?.length) {
      throw new Error('there is no scf instance to update')
    }
    return scfInstances
  }

  async deploy(options: PartialRunOptions = {}) {
    return this.instanceService.runAll('deploy', options)
  }

  async remove(options: PartialRunOptions = {}) {
    return this.instanceService.runAll('remove', options)
  }

  async info(options: PartialRunOptions = {}) {
    const runOptions = this.instanceService.getRunOptions(options)
    const resolvedInstances = await this.instanceService.resolve(
      'deploy',
      runOptions,
    )
    if (!resolvedInstances.length) {
      throw new Error('there is no serverless instance to show')
    }

    const infoOptions = {
      ...runOptions,
      pollInterval: 0,
      pollTimeout: 0,
    }

    const infoPromises = resolvedInstances.map((instance) =>
      this.instanceService
        .poll(instance, infoOptions)
        .catch((error) => ({ instance, error })),
    )
    const resultList = await Promise.all(infoPromises)
    const infoList = resultList.map((result) =>
      result instanceof Error ? result : result,
    ) as Array<ResultInstance | Error>

    return infoList
  }

  async list(params: ListInstancesParams = {}) {
    const result = await this.apiService.listInstances(params)
    return result.Response?.instances
  }

  async dev(options: PartialRunOptions = {}) {
    const runOptions = this.instanceService.getRunOptions(options)
    const scfInstances = await this.getScfInstances(runOptions)
    for (const instance of scfInstances) {
      const instanceResult = await this.instanceService.poll(
        instance,
        runOptions,
      )
      if (instanceResult?.instanceStatus === 'inactive') {
        throw new Error('instance not exists, please run "deploy" first')
      }
      const src = instance.$src?.src
      if (!src) continue
      const watcher = chokidar.watch(src)
      const watch$ = new Observable<{ event: string; file: string }>(
        (observer) => {
          watcher.on('all', async (event, file) => {
            observer.next({ event, file })
          })
        },
      )
      watch$
        .pipe(debounceTime(runOptions.devServer.updateDebounceTime))
        .pipe(
          concatMap(
            () =>
              new Observable((observer) => {
                this.instanceService
                  .updateFunctionCode(instance, runOptions)
                  .then(() => observer.complete())
              }),
          ),
        )
        .subscribe()
      this.instanceService.pollFunctionLogs(instance, runOptions)
    }
    return new Promise(() => {})
  }

  async logs(options: PartialRunOptions = {}) {
    const runOptions = this.instanceService.getRunOptions(options)
    const scfInstances = await this.getScfInstances(runOptions)

    for (const instance of scfInstances) {
      this.instanceService.pollFunctionLogs(instance, runOptions)
    }
    return new Promise(() => {})
  }
}
