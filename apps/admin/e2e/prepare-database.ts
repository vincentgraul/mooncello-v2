import { execFileSync } from 'node:child_process'
import pg from 'pg'

const API_DIRECTORY = new URL('../../api', import.meta.url).pathname

function requireEnv(name: string): string {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Variable d'environnement manquante : ${name}`)
  }

  return value
}

async function recreateDatabase(databaseUrl: string): Promise<void> {
  const url = new URL(databaseUrl)
  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ''))

  if (!databaseName.endsWith('_e2e')) {
    throw new Error(
      `Refus de réinitialiser « ${databaseName} » : la base e2e doit être suffixée « _e2e »`,
    )
  }

  const maintenanceUrl = new URL(databaseUrl)
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

function runMigrations(): void {
  execFileSync('bunx', ['better-auth', 'migrate', '--config', 'src/modules/auth/auth.ts', '-y'], {
    cwd: API_DIRECTORY,
    stdio: 'inherit',
  })

  execFileSync('bun', ['src/shared/database/migrator.ts', 'up'], {
    cwd: API_DIRECTORY,
    stdio: 'inherit',
  })
}

const databaseUrl = requireEnv('DATABASE_URL')

await recreateDatabase(databaseUrl)
runMigrations()

console.info(`Base e2e prête : ${databaseUrl}`)
