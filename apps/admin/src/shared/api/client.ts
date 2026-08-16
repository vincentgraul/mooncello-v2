import {
  apiErrorSchema,
  type CreateInitialAdminRequest,
  createInitialAdminResponseSchema,
  INSTALLATION_ROUTES,
  installationStatusResponseSchema,
} from '@mooncello/contracts'
import { z } from 'zod'
import { env } from '@/shared/config'
import { ApiRequestError, HTTP_ERROR_CODE } from './api-request-error'

const healthResponseSchema = z.object({ status: z.string() })

function buildHeaders(init?: RequestInit): Headers {
  const headers = new Headers(init?.headers)

  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  return headers
}

export async function apiRequest<T>(
  path: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${env.VITE_API_URL}${path}`, {
    credentials: 'include',
    ...init,
    headers: buildHeaders(init),
  })

  const payload: unknown = await response.json()

  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(payload)

    throw parsed.success
      ? new ApiRequestError(parsed.data.code, parsed.data.message)
      : new ApiRequestError(HTTP_ERROR_CODE, `Erreur HTTP ${response.status}`)
  }

  return schema.parse(payload)
}

export const apiClient = {
  getHealth: () => apiRequest('/health', healthResponseSchema),
  getInstallationStatus: () =>
    apiRequest(INSTALLATION_ROUTES.status.path, installationStatusResponseSchema, {
      method: INSTALLATION_ROUTES.status.method,
    }),
  createInitialAdmin: (body: CreateInitialAdminRequest) =>
    apiRequest(INSTALLATION_ROUTES.createInitialAdmin.path, createInitialAdminResponseSchema, {
      method: INSTALLATION_ROUTES.createInitialAdmin.method,
      body: JSON.stringify(body),
    }),
}
