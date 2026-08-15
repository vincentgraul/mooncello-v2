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

async function request<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  const response = await fetch(`${env.VITE_API_URL}${path}`, {
    credentials: 'include',
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
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
  getHealth: () => request('/health', healthResponseSchema),
  getInstallationStatus: () =>
    request(INSTALLATION_ROUTES.status.path, installationStatusResponseSchema, {
      method: INSTALLATION_ROUTES.status.method,
    }),
  createInitialAdmin: (body: CreateInitialAdminRequest) =>
    request(INSTALLATION_ROUTES.createInitialAdmin.path, createInitialAdminResponseSchema, {
      method: INSTALLATION_ROUTES.createInitialAdmin.method,
      body: JSON.stringify(body),
    }),
}
