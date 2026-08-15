import type { ApiError } from '@mooncello/contracts'
import type { ErrorHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { ZodError } from 'zod'

export const errorHandler: ErrorHandler = (error, c) => {
  if (error instanceof ZodError) {
    const body: ApiError = {
      code: 'validation_error',
      message: 'Requête invalide',
      issues: error.issues.map((issue) => ({
        path: issue.path.map(String),
        message: issue.message,
      })),
    }
    return c.json(body, 422)
  }

  if (error instanceof HTTPException) {
    const body: ApiError = { code: 'http_error', message: error.message }
    return c.json(body, error.status)
  }

  console.error(error)
  const body: ApiError = { code: 'internal_error', message: 'Erreur interne' }
  return c.json(body, 500)
}
