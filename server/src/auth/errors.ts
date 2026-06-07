// Typed error carrying an HTTP status, so routes can map failures to responses.
export class AuthError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message)
    this.name = 'AuthError'
  }
}
