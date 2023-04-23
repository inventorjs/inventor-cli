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
