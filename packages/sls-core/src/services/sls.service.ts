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
  SlsTemplate,
} from '../types/index.js'

import { createRequire } from 'node:module'
import path from 'node:path'
import chokidar from 'chokidar'
import { Observable, debounceTime, switchMap } from 'rxjs'
import { COMPONENT_SCF } from '../constants.js'
import { InstanceService, type ListInstanceParams } from './instance.service.js'
import { ApiService } from './api.service.js'
import { TemplateService } from './template.service.js'
import { NoInstanceError } from '../errors.js'

const require = createRequire(import.meta.url)
export class SlsService {
  private instanceService: InstanceService
  private apiService: ApiService
  private templateService: TemplateService

  constructor(private readonly config: SlsConfig) {
    this.instanceService = new InstanceService(this.config)
    this.apiService = new ApiService(this.config)
    this.templateService = new TemplateService(this.config)
  }

  private getResultError(instance: SlsInstance, error: Error) {
    return {
      $instance: instance,
      $error: error,
    }
  }

  private async resolve(
    options: PartialRunOptions,
    action: RunAction = 'deploy',
  ) {
    const runOptions = this.instanceService.getRunOptions(options)
    let { instances, ...rest } = await this.templateService.resolve(
      action,
      runOptions,
    )
    if (!instances?.length) {
      throw new NoInstanceError()
    }
    return { template: { instances, ...rest }, options: runOptions }
  }

  private async runHooks<T = unknown>(
    runner: () => Promise<T>,
    {
      hookName,
      options,
      template,
      hooks,
    }: {
      hookName: string
      options: unknown
      template?: SlsTemplate
      hooks?: Record<string, string>
    },
  ) {
    if (!hooks || !Object.keys(hooks).length) return runner()

    let beforeHooks: Array<
      (n: string, o: unknown, t: unknown) => Promise<unknown>
    > = []
    let afterHooks: Array<
      (n: string, o: unknown, t: unknown) => Promise<unknown>
    > = []
    for (const [hook, handler] of Object.entries(hooks)) {
      const [period, name] = hook.split(':')
      if (!['before', 'after'].includes(period) || !name) continue
      const [pkgName, funName] = handler.split('.')
      if (!pkgName || !funName) continue
      let packagePath = /^\.?\.?\//.test(pkgName)
        ? path.resolve(this.config.slsPath, 'serverless.yml', pkgName)
        : path.resolve(process.cwd(), 'node_modules', pkgName)
      let fun
      try {
        ;({ [funName]: fun } = require(packagePath))
      } catch (err) {
        throw new Error(
          `hook: "${hook}" handler: "${handler}" 加载失败\n目标路径: ${packagePath}\n请检查模版 hooks 配置是否正确`,
        )
      }
      if (period === 'before' && (name === 'all' || name === hookName)) {
        beforeHooks.push(fun)
      }
      if (period === 'after' && (name === 'all' || name === hookName)) {
        afterHooks.push(fun)
      }
    }
    for (const fun of beforeHooks) {
      await fun(hookName, options, template)
    }
    const result = await runner()
    for (const fun of afterHooks) {
      await fun(hookName, options, template)
    }
    return result
  }

  private async run(action: RunAction, options: PartialRunOptions = {}) {
    const { template, options: runOptions } = await this.resolve(
      options,
      action,
    )
    const { hooks, instances } = template
    return this.runHooks<Array<ResultInstance | ResultInstanceError>>(
      async () => {
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
      },
      { hookName: action, options: runOptions, template, hooks },
    )
  }

  async deploy(options: PartialRunOptions = {}) {
    return this.run('deploy', options)
  }

  async remove(options: PartialRunOptions = {}) {
    return this.run('remove', options)
  }

  async info(options: PartialRunOptions = {}) {
    const { template, options: runOptions } = await this.resolve(options)
    const { hooks, instances } = template
    const infoOptions = {
      ...runOptions,
      pollInterval: 0,
      pollTimeout: 0,
    }
    return this.runHooks<Array<ResultInstance | Error>>(
      async () => {
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
      },
      { hookName: 'info', options: runOptions, template, hooks },
    )
  }

  async dev(options: PartialRunOptions = {}) {
    const { template, options: runOptions } = await this.resolve(options)
    const { hooks, instances } = template
    const scfInstances = instances.filter((instance) =>
      [COMPONENT_SCF].includes(instance.component),
    )

    if (!scfInstances?.length) {
      throw new NoInstanceError('云函数')
    }

    return this.runHooks(
      async () => {
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
                {
                  ...instance,
                  inputs: { ...instance.inputs, name, namespace },
                },
                runOptions,
              )
              if (!startPollFunctionLogs) {
                this.instanceService.pollFunctionLogs(instance, runOptions)
                startPollFunctionLogs = true
              }
            })
        }
        return new Promise(() => {})
      },
      { hookName: 'dev', options: runOptions, template, hooks },
    )
  }

  async logs(options: PartialRunOptions = {}) {
    const { template, options: runOptions } = await this.resolve(options)
    const { hooks, instances } = template
    const scfInstances = instances.filter((instance) =>
      [COMPONENT_SCF].includes(instance.component),
    )

    if (!scfInstances?.length) {
      throw new NoInstanceError('云函数')
    }
    return this.runHooks(
      () => {
        for (const instance of scfInstances) {
          this.instanceService.pollFunctionLogs(instance, runOptions)
        }
        return new Promise(() => {})
      },
      { hookName: 'logs', options: runOptions, template, hooks },
    )
  }

  async list(options: ListInstanceParams = {}) {
    let template: SlsTemplate | undefined
    let runOptions
    try {
      ;({ template, options: runOptions } = await this.resolve(options))
    } catch (err) {
      // empty
    }

    const { org, app, stage, hooks } = template ?? {}

    let realOptions = { ...options }
    if (org && !options.org) {
      Object.assign(realOptions, { org })
    }
    if (app && !options.apps) {
      Object.assign(realOptions, { apps: [app] })
    }
    if (stage && !options.stages) {
      Object.assign(realOptions, { stages: [stage] })
    }
    if (hooks) {
      return this.runHooks(() => this.instanceService.list(realOptions), {
        hookName: 'list',
        options: runOptions,
        template,
        hooks: hooks as Record<string, string>,
      })
    }

    return this.instanceService.list(realOptions)
  }

  async login() {
    let template: SlsTemplate | undefined
    let runOptions
    try {
      ;({ template, options: runOptions } = await this.resolve({}))
    } catch (err) {
      // empty
    }
    const { hooks } = template ?? {}
    if (hooks) {
      return this.runHooks(() => this.apiService.login(), {
        hookName: 'login',
        options: runOptions,
        template,
        hooks: hooks as Record<string, string>,
      })
    }

    return this.apiService.login()
  }

  async checkLogin() {
    return this.apiService.getAppId()
  }
}
