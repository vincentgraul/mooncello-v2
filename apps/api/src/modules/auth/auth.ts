import { betterAuth } from 'better-auth'
import pg from 'pg'
import { env } from '../../shared/config/env'

export const auth = betterAuth({
  database: new pg.Pool({ connectionString: env.DATABASE_URL }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: [env.ADMIN_ORIGIN],
  emailAndPassword: {
    enabled: true,
  },
})
