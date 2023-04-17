/**
 * decorators
 */
export function reportStatus(statusData: {
  status: string
  statusText: string
}) {
  return function (...args: any[]) {
    const descriptor = args.at(-1)
    const originMehtod = descriptor.value
    descriptor.value = async function (...args: any[]) {
      const options = args.find((arg) => typeof arg.reportStatus === 'function')
      if (!options) {
        return originMehtod.call(this, ...args)
      }
      const instance = args.find(
        (arg) => arg.name && arg.component && arg.stage,
      )
      const report = options.reportStatus
      const { status } = statusData
      performance.mark(`${status}-start`)
      report({
        ...statusData,
        period: 'start',
        instance,
      })
      const result = await originMehtod.call(this, ...args)
      performance.mark(`${status}-end`)
      const measure = performance.measure(
        status,
        `${status}-start`,
        `${status}-end`,
      )
      report({
        ...statusData,
        period: 'end',
        instance,
        duration: Math.round(measure.duration ?? 0),
      })
      return result
    }
  }
}
