import { betterAuth } from 'better-auth'
import { env } from '../../shared/config/env'
import { pool } from '../../shared/database/database'

export const auth = betterAuth({
  database: pool,
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: [env.ADMIN_ORIGIN],
  emailAndPassword: {
    enabled: true,
  },
})
