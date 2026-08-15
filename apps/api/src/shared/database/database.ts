import { CamelCasePlugin, Kysely, PostgresDialect } from 'kysely'
import pg from 'pg'
import { env } from '../config/env'
import type { Database } from './schema'

export const pool = new pg.Pool({ connectionString: env.DATABASE_URL })

export const database = new Kysely<Database>({
  dialect: new PostgresDialect({ pool }),
  plugins: [new CamelCasePlugin()],
})
