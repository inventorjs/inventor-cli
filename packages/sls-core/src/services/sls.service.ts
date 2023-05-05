/**
 * sls service
 */
import type {
  RunAction,
  ResultInstance,
  SlsInstance,
  SlsConfig,
  PartialRunOptions,
  ResultInstanceError,
  ScfResultInstance,
  RunOptions,
} from '../types/index.js'

import chokidar from 'chokidar'
import { Observable, debounceTime, switchMap } from 'rxjs'
import { COMPONENT_SCF } from '../constants.js'
import { InstanceService, type ListInstanceParams } from './instance.service.js'
import { ApiService } from './api.service.js'
import { TemplateService } from './template.service.js'
import { NoInstanceError } from '../errors.js'

export class SlsService {
  private instanceService: InstanceService
  private apiService: ApiService
  private templateService: TemplateService

  constructor(config: SlsConfig) {
    this.instanceService = new InstanceService(config)
    this.apiService = new ApiService(config)
    this.templateService = new TemplateService(config)
  }

  private getResultError(instance: SlsInstance, error: Error) {
    return {
      $instance: instance,
      $error: error,
    }
  }

  private async resolve(action: RunAction, options: PartialRunOptions) {
    const runOptions = this.instanceService.getRunOptions(options)
    let { hooks, instances } = await this.templateService.resolve(
      action,
      runOptions,
    )
    if (!instances?.length) {
      throw new NoInstanceError()
    }
    return { instances, hooks, options: runOptions }
  }

  private async runHooks<T = unknown>(runner: () => Promise<T>, hookName: string, options: RunOptions, hooks?: Record<string, string>) {
    if (!hooks || !Object.keys(hooks).length) return runner()

    let beforeHooks: Array<(d: unknown) => Promise<unknown>> = []
    let afterHooks: Array<(d: unknown) => Promise<unknown>> = []
    for (const [hook, handler] of Object.entries(hooks)) {
      const [period, name] = hook.split(':')
      if (!['before', 'after'].includes(period) || !name) continue
      const [pkgName, funName] = handler.split('.')
      if (!pkgName || !funName) continue
      const { [funName]: fun } = await import(pkgName)
      if (period === 'before' && (name === 'all' || name === hookName)) {
        beforeHooks.push(fun)
      }
      if (period === 'after' && (name === 'all' || name === hookName)) {
        afterHooks.push(fun)
      }
    }
    for (const fun of beforeHooks) {
      await fun(options)
    }
    const result = await runner()
    for (const fun of afterHooks) {
      await fun(options)
    }
    return result
  }

  private async run(action: RunAction, options: PartialRunOptions = {}) {
    const { hooks, instances, options: runOptions } =
      await this.resolve(action, options)
    return this.runHooks<Array<ResultInstance | ResultInstanceError>>(async () => {
      const runResults: Array<ResultInstance | ResultInstanceError> = []
      for (const instance of instances) {
        await this.instanceService.run(action, instance, runOptions)
        let result
        try {
          result = await this.instanceService.poll(instance, runOptions)
        } catch (err) {
          result = this.getResultError(instance, err as Error)
        }
        runResults.push(result)
      }
      return runResults

    }, action, runOptions, hooks)
  }

  async deploy(options: PartialRunOptions = {}) {
    return this.run('deploy', options)
  }

  async remove(options: PartialRunOptions = {}) {
    return this.run('remove', options)
  }

  async info(options: PartialRunOptions = {}) {
    const { hooks, instances, options: runOptions } =
      await this.resolve('deploy', options)
    const infoOptions = {
      ...runOptions,
      pollInterval: 0,
      pollTimeout: 0,
    }
    return this.runHooks<Array<ResultInstance | Error>>(async () => {
      const infoPromises = instances.map((instance) =>
        this.instanceService
          .poll(instance, infoOptions)
          .catch((err) => this.getResultError(instance, err as Error)),
      )
      const resultList = await Promise.all(infoPromises)
      const infoList = resultList.map((result) =>
        result instanceof Error ? result : result,
      ) as Array<ResultInstance | Error>

      return infoList
    }, 'info', runOptions, hooks)
  }

  async dev(options: PartialRunOptions = {}) {
    const { hooks, instances, options: runOptions } =
      await this.resolve('deploy', options)
    const scfInstances = instances.filter((instance) =>
      [COMPONENT_SCF].includes(instance.component),
    )

    if (!scfInstances?.length) {
      throw new NoInstanceError('云函数')
    }

    return this.runHooks(async () => {
      for (const instance of scfInstances) {
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
        let startPollFunctionLogs = false
        watch$
          .pipe(
            debounceTime(runOptions.devServer.updateDebounceTime),
            switchMap(
              () =>
                new Observable<ResultInstance>((observer) => {
                  this.instanceService
                    .poll(instance, runOptions)
                    .then((result) => {
                      const resultInstance = result as ScfResultInstance
                      if (resultInstance?.instanceStatus === 'inactive') {
                        throw new Error(
                          '云函数实例不存在，请先执行 "deploy" 进行部署',
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
            if (!startPollFunctionLogs) {
              this.instanceService.pollFunctionLogs(instance, runOptions)
              startPollFunctionLogs = true
            }
          })
      }
      return new Promise(() => { })
    }, 'dev', runOptions, hooks)
  }

  async logs(options: PartialRunOptions = {}) {
    const { hooks, instances, options: runOptions } =
      await this.resolve('deploy', options)
    const scfInstances = instances.filter((instance) =>
      [COMPONENT_SCF].includes(instance.component),
    )

    if (!scfInstances?.length) {
      throw new NoInstanceError('云函数')
    }
    return this.runHooks(() => {
      for (const instance of scfInstances) {
        this.instanceService.pollFunctionLogs(instance, runOptions)
      }
      return new Promise(() => { })
    }, 'logs', runOptions, hooks)
  }

  async list(params: ListInstanceParams = {}) {
    return this.instanceService.list(params)
  }

  async login() {
    return this.apiService.login()
  }

  async checkLogin() {
    return this.apiService.getAppId()
  }
}
