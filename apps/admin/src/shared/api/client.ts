import { apiErrorSchema } from '@mooncello/contracts'
import { z } from 'zod'
import { env } from '@/shared/config'

const healthResponseSchema = z.object({ status: z.string() })

async function request<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  const response = await fetch(`${env.VITE_API_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })

  const payload: unknown = await response.json()

  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(payload)
    throw new Error(parsed.success ? parsed.data.message : `Erreur HTTP ${response.status}`)
  }

  return schema.parse(payload)
}

export const apiClient = {
  getHealth: () => request('/health', healthResponseSchema),
}
