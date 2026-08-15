import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  API_PORT: z.coerce.number().int().positive().default(3333),
  ADMIN_ORIGIN: z.url(),
  MEDIA_STORAGE_DRIVER: z.enum(['local']).default('local'),
  MEDIA_LOCAL_PATH: z.string().min(1).default('./storage/media'),
  MEDIA_MAX_SIZE_BYTES: z.coerce.number().int().positive().default(10_485_760),
})

export type Env = z.infer<typeof envSchema>

export const env: Env = envSchema.parse(process.env)
