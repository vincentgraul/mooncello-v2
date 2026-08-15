import { promises as fs } from 'node:fs'
import path from 'node:path'
import { Kysely, PostgresDialect } from 'kysely'
import { FileMigrationProvider, Migrator } from 'kysely/migration'
import pg from 'pg'
import { env } from '../config/env'

const direction = process.argv[2] ?? 'up'

const db = new Kysely<unknown>({
  dialect: new PostgresDialect({
    pool: new pg.Pool({ connectionString: env.DATABASE_URL }),
  }),
})

const migrator = new Migrator({
  db,
  provider: new FileMigrationProvider({
    fs,
    path,
    migrationFolder: path.join(import.meta.dir, '..', '..', 'migrations'),
  }),
})

const { error, results } =
  direction === 'down' ? await migrator.migrateDown() : await migrator.migrateToLatest()

for (const result of results ?? []) {
  const label = `${result.migrationName} (${result.direction})`
  console.info(result.status === 'Success' ? `✔ ${label}` : `✖ ${label}`)
}

await db.destroy()

if (error) {
  console.error(error)
  process.exit(1)
}
