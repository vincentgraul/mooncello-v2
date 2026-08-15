import type { ApiError } from '@mooncello/contracts'
import { createInitialAdminRequestSchema, INSTALLATION_ERROR_CODES } from '@mooncello/contracts'
import type { Handler } from 'hono'
import { AlreadyInstalledError, createInitialAdmin } from './installation.service'

export const createInitialAdminHandler: Handler = async (c) => {
  const payload = createInitialAdminRequestSchema.parse(await c.req.json().catch(() => null))

  try {
    const { body, sessionCookies } = await createInitialAdmin(payload)

    for (const cookie of sessionCookies) {
      c.header('set-cookie', cookie, { append: true })
    }

    return c.json(body, 201)
  } catch (error) {
    if (error instanceof AlreadyInstalledError) {
      const body: ApiError = {
        code: INSTALLATION_ERROR_CODES.alreadyInstalled,
        message: error.message,
      }

      return c.json(body, 404)
    }

    throw error
  }
}
