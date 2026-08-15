import { z } from 'zod'

export const INSTALLATION_ROUTES = {
  status: { method: 'GET', path: '/api/installation/status' },
  createInitialAdmin: { method: 'POST', path: '/api/installation' },
} as const

export const INITIAL_ADMIN_PASSWORD_MIN_LENGTH = 12

export const installationStatusResponseSchema = z.strictObject({
  installed: z.boolean(),
})

export type InstallationStatusResponse = z.infer<typeof installationStatusResponseSchema>

export const createInitialAdminRequestSchema = z.strictObject({
  name: z.string().min(1).max(120),
  email: z.email(),
  password: z
    .string()
    .min(
      INITIAL_ADMIN_PASSWORD_MIN_LENGTH,
      `Le mot de passe doit faire au moins ${INITIAL_ADMIN_PASSWORD_MIN_LENGTH} caractères`,
    ),
})

export type CreateInitialAdminRequest = z.infer<typeof createInitialAdminRequestSchema>

export const createInitialAdminResponseSchema = z.strictObject({
  user: z.strictObject({
    id: z.string().min(1),
    name: z.string().min(1),
    email: z.email(),
  }),
})

export type CreateInitialAdminResponse = z.infer<typeof createInitialAdminResponseSchema>

export const INSTALLATION_ERROR_CODES = {
  alreadyInstalled: 'already_installed',
} as const
