/**
 * errors
 */
export class ApiError extends Error {
  constructor(error: Error, cause: unknown) {
    super(error.message)
    this.name = error.name
    this.stack = error.stack
    this.cause = cause
  }
}

export class NoInstanceError extends Error {
  constructor(name: string = '') {
    super(`没有找到有效的${name}实例配置`)
  }
}

export class NoSrcFilesError extends Error {
  constructor() {
    super('没有找到有效的源代码文件')
  }
}

export class NoSrcConfigError extends Error {
  constructor() {
    super('没有找到有效的 src 配置')
  }
}

export class CircularError extends Error {
  constructor() {
    super('实例配置存在循环应用, 请检查 ${output:...} 配置')
  }
}
