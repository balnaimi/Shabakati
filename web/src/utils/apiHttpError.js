/** Error thrown when an API returns a non-OK JSON body (includes optional `code` / `details` for i18n). */
export class ApiHttpError extends Error {
  constructor(message, { code, status, details } = {}) {
    super(message)
    this.name = 'ApiHttpError'
    this.code = code
    this.status = status
    this.details = details
  }
}
