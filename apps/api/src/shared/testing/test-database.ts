import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getMigrations } from 'better-auth/db/migration'
import { Kysely, PostgresDialect, sql } from 'kysely'
import { FileMigrationProvider, Migrator } from 'kysely/migration'
import pg from 'pg'
import { auth } from '../../modules/auth/auth'
import { env } from '../config/env'
import { database } from '../database/database'

const RESET_TABLES = ['user', 'session', 'account', 'verification', 'user_roles']

async function recreateDatabase(): Promise<void> {
  const url = new URL(env.DATABASE_URL)
  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ''))

  if (!databaseName.endsWith('_test')) {
    throw new Error(
      `Refus de réinitialiser « ${databaseName} » : la base de test doit être suffixée « _test »`,
    )
  }

  const maintenanceUrl = new URL(env.DATABASE_URL)
  maintenanceUrl.pathname = '/postgres'

  const client = new pg.Client({ connectionString: maintenanceUrl.toString() })
  await client.connect()

  try {
    await client.query(`drop database if exists "${databaseName}" with (force)`)
    await client.query(`create database "${databaseName}"`)
  } finally {
    await client.end()
  }
}

async function runCmsMigrations(): Promise<void> {
  const migrationDatabase = new Kysely<unknown>({
    dialect: new PostgresDialect({
      pool: new pg.Pool({ connectionString: env.DATABASE_URL }),
    }),
  })

  const migrator = new Migrator({
    db: migrationDatabase,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        '..',
        '..',
        'migrations',
      ),
    }),
  })

  const { error } = await migrator.migrateToLatest()

  await migrationDatabase.destroy()

  if (error) {
    throw error
  }
}

async function runAuthMigrations(): Promise<void> {
  const { runMigrations } = await getMigrations(auth.options)
  await runMigrations()
}

export async function prepareTestDatabase(): Promise<void> {
  await recreateDatabase()
  await runAuthMigrations()
  await runCmsMigrations()
}

export async function resetTestDatabase(): Promise<void> {
  await sql`truncate table ${sql.join(RESET_TABLES.map((table) => sql.ref(table)))} restart identity cascade`.execute(
    database,
  )
}

export async function closeTestDatabase(): Promise<void> {
  await database.destroy()
}
