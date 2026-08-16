import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const API_DIRECTORY = fileURLToPath(new URL('../../api', import.meta.url))

const REQUIRED_ENV_VARIABLES = [
  'DATABASE_URL',
  'BETTER_AUTH_SECRET',
  'BETTER_AUTH_URL',
  'ADMIN_ORIGIN',
] as const

function requireEnv(): Record<(typeof REQUIRED_ENV_VARIABLES)[number], string> {
  const missing = REQUIRED_ENV_VARIABLES.filter((name) => !process.env[name])

  if (missing.length > 0) {
    throw new Error(
      `Variables d'environnement manquantes : ${missing.join(', ')}. ` +
        `Les migrations Better Auth chargent la configuration de l'API, qui exige ${REQUIRED_ENV_VARIABLES.join(', ')}. ` +
        `Lancez « bun run test:e2e », qui les fournit, ou définissez-les avant « bun run test:e2e:db ».`,
    )
  }

  return Object.fromEntries(
    REQUIRED_ENV_VARIABLES.map((name) => [name, String(process.env[name])]),
  ) as Record<(typeof REQUIRED_ENV_VARIABLES)[number], string>
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

const { DATABASE_URL: databaseUrl } = requireEnv()

await recreateDatabase(databaseUrl)
runMigrations()

console.info(`Base e2e prête : ${databaseUrl}`)
