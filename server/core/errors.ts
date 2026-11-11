/** Thrown by core logic for bad input. API handlers turn it into a 400 with `code`. */
export class ValidationError extends Error {
  constructor(public code: string, message: string) {
    super(message)
  }
}
export class NotFoundError extends Error {}
