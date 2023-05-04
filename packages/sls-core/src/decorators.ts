/**
 * decorators
 */
import { REPORT_END, REPORT_START } from './constants.js'
import type { RunOptions, SlsInstance } from './types/index.js'

export function reportStatus(statusData: {
  status: string
  statusText: string
}) {
  return function (...args: unknown[]) {
    const descriptor = args.at(-1) as PropertyDescriptor
    const originMehtod = descriptor.value
    descriptor.value = async function (...args: unknown[]) {
      const options = args.find(
        (arg) => typeof (arg as RunOptions)?.reportStatus === 'function',
      ) as RunOptions
      if (!options) {
        return originMehtod.call(this, ...args)
      }
      const instance = args.find((arg) => {
        const instance = arg as SlsInstance
        return instance.name && instance.component && instance.stage
      }) as SlsInstance
      const report = options.reportStatus

      const startTime = Date.now()
      await report({
        ...statusData,
        point: REPORT_START,
        instance,
      })
      let result, error
      try {
        result = await originMehtod.call(this, ...args)
      } catch (err) {
        error = err
      }
      const duration = Date.now() - startTime

      await report({
        ...statusData,
        statusText: statusData.statusText,
        point: REPORT_END,
        instance,
        duration,
      })

      if (error) {
        throw error
      } else {
        return result
      }
    }
  }
}

export function runHooks(hookName: string) {
  return function (...args: unknown[]) {
    const descriptor = args.at(-1) as PropertyDescriptor
    const originMehtod = descriptor.value
    descriptor.value = async function (...args: unknown[]) {
      const result = await originMehtod.call(this, ...args)
      return result
    }
  }
}
