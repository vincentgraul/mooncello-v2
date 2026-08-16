import type { ApiError } from '@mooncello/contracts'
import { createInitialAdminRequestSchema, INSTALLATION_ERROR_CODES } from '@mooncello/contracts'
import type { Context, Handler } from 'hono'
import { AlreadyInstalledError, createInitialAdmin, isInstalled } from './installation.service'

function alreadyInstalled(c: Context, message: string): Response {
  const body: ApiError = { code: INSTALLATION_ERROR_CODES.alreadyInstalled, message }

  return c.json(body, 404)
}

export const createInitialAdminHandler: Handler = async (c) => {
  if (await isInstalled()) {
    return alreadyInstalled(c, new AlreadyInstalledError().message)
  }

  const payload = createInitialAdminRequestSchema.parse(await c.req.json().catch(() => null))

  try {
    const { body, sessionCookies } = await createInitialAdmin(payload, c.req.raw.headers)

    for (const cookie of sessionCookies) {
      c.header('set-cookie', cookie, { append: true })
    }

    return c.json(body, 201)
  } catch (error) {
    if (error instanceof AlreadyInstalledError) {
      return alreadyInstalled(c, error.message)
    }

    throw error
  }
}
