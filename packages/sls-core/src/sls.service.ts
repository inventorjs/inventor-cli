/**
 * sls service
 */
import type {
  RunOptions,
  RunAction,
  ResultInstance,
  SlsConfig,
  PartialRunOptions,
  ResultInstanceError,
} from './types/index.js'

import chokidar from 'chokidar'
import { Observable, debounceTime, switchMap } from 'rxjs'
import { COMPONENT_SCF } from './constants.js'
import { InstanceService, type ListInstanceParams } from './instance.service.js'
import { runHooks } from './decorators.js'

export class SlsService {
  private instanceService: InstanceService

  constructor(config: SlsConfig) {
    this.instanceService = new InstanceService(config)
  }

  private async getScfInstances(options: RunOptions) {
    const resolvedInstances = await this.instanceService.resolve(
      'deploy',
      options,
    )
    const scfInstances = resolvedInstances?.filter?.((instance) =>
      [COMPONENT_SCF].includes(instance.component),
    )
    return scfInstances
  }

  private async resolve(action: RunAction, options: PartialRunOptions) {
    const runOptions = this.instanceService.getRunOptions(options)
    let resolvedInstances = await this.instanceService.resolve(
      action,
      runOptions,
    )
    if (!resolvedInstances?.length) {
      throw new Error(`there is no serverless instance to ${action}`)
    }
    return { instances: resolvedInstances, options: runOptions }
  }

  private async run(action: RunAction, options: PartialRunOptions = {}) {
    const { instances: resolvedInstances, options: runOptions } =
      await this.resolve(action, options)
    const runResults: Array<ResultInstance | ResultInstanceError> = []
    for (const instance of resolvedInstances) {
      runResults.push(
        await this.instanceService.run(action, instance, runOptions),
      )
    }
    return runResults
  }

  @runHooks('deploy')
  async deploy(options: PartialRunOptions = {}) {
    return this.run('deploy', options)
  }

  @runHooks('remove')
  async remove(options: PartialRunOptions = {}) {
    return this.run('remove', options)
  }

  @runHooks('info')
  async info(options: PartialRunOptions = {}) {
    const { instances: resolvedInstances, options: runOptions } =
      await this.resolve('deploy', options)
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

  @runHooks('list')
  async list(params: ListInstanceParams = {}) {
    const result = await this.instanceService.list(params)
    return result.Response?.instances
  }

  @runHooks('dev')
  async dev(options: PartialRunOptions = {}) {
    const { instances: resolvedInstances, options: runOptions } =
      await this.resolve('deploy', options)
    const scfInstances = resolvedInstances.filter((instance) =>
      [COMPONENT_SCF].includes(instance.name),
    )

    if (!scfInstances?.length) {
      throw new Error('there is no scf instance to update')
    }

    for (const instance of scfInstances) {
      const src = instance.$src?.src
      if (!src) continue
      const watcher = chokidar.watch(src)
      const watch$ = new Observable<ResultInstance>((observer) => {
        watcher.on('all', async (event, file) => {
          observer.next()
        })
      })
      watch$
        .pipe(
          debounceTime(runOptions.devServer.updateDebounceTime),
          switchMap(
            () =>
              new Observable<ResultInstance>((observer) => {
                this.instanceService
                  .poll(instance, runOptions)
                  .then((result) => {
                    const instanceError = result as ResultInstanceError
                    const resultInstance = result as ResultInstance
                    if (instanceError.$error) {
                      throw instanceError.$error
                    }
                    if (resultInstance?.instanceStatus === 'inactive') {
                      throw new Error(
                        'instance not exists, please run "deploy" first',
                      )
                    }
                    observer.next(resultInstance)
                  })
              }),
          ),
        )
        .subscribe((resultInstance) => {
          const { name, namespace } = resultInstance.inputs
          this.instanceService.updateFunctionCode(
            { ...instance, inputs: { ...instance.inputs, name, namespace } },
            runOptions,
          )
        })
      this.instanceService.pollFunctionLogs(instance, runOptions)
    }
    return new Promise(() => {})
  }

  @runHooks('logs')
  async logs(options: PartialRunOptions = {}) {
    const { instances: resolvedInstances, options: runOptions } =
      await this.resolve('deploy', options)
    const scfInstances = resolvedInstances.filter((instance) =>
      [COMPONENT_SCF].includes(instance.name),
    )

    if (!scfInstances?.length) {
      throw new Error('there is no scf instance to logs')
    }
    for (const instance of scfInstances) {
      this.instanceService.pollFunctionLogs(instance, runOptions)
    }
    return new Promise(() => {})
  }
}
