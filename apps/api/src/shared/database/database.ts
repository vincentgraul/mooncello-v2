import { CamelCasePlugin, Kysely, PostgresDialect } from 'kysely'
import pg from 'pg'
import { env } from '../config/env'
import type { Database } from './schema'

export const DATABASE_POOL_MAX_CONNECTIONS = 10

const CONNECTION_ACQUISITION_TIMEOUT_MS = 10_000

function createPool(): pg.Pool {
  return new pg.Pool({
    connectionString: env.DATABASE_URL,
    max: DATABASE_POOL_MAX_CONNECTIONS,
    connectionTimeoutMillis: CONNECTION_ACQUISITION_TIMEOUT_MS,
  })
}

export const pool = createPool()

export const authPool = createPool()

export const database = new Kysely<Database>({
  dialect: new PostgresDialect({ pool }),
  plugins: [new CamelCasePlugin()],
})

export async function closeDatabase(): Promise<void> {
  await database.destroy()
  await authPool.end()
}
