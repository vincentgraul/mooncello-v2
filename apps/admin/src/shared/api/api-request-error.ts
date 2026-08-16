export const HTTP_ERROR_CODE = 'http_error'

export class ApiRequestError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'ApiRequestError'
    this.code = code
  }
}
