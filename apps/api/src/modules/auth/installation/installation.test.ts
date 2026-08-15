import {
  createInitialAdminResponseSchema,
  INSTALLATION_ERROR_CODES,
  INSTALLATION_ROUTES,
  installationStatusResponseSchema,
} from '@mooncello/contracts'
import { sql } from 'kysely'
import { beforeEach, describe, expect, it } from 'vitest'
import { app } from '../../../app'
import { DATABASE_POOL_MAX_CONNECTIONS, database } from '../../../shared/database/database'
import { resetTestDatabase } from '../../../shared/testing/test-database'

const initialAdmin = {
  name: 'Ada Lovelace',
  email: 'ada@mooncello.test',
  password: 'correct-horse-battery-staple',
}

const CONCURRENT_SUBMISSIONS = DATABASE_POOL_MAX_CONNECTIONS + 2

async function requestStatus(): Promise<Response> {
  return app.request(INSTALLATION_ROUTES.status.path)
}

async function requestInstallation(body: unknown): Promise<Response> {
  return app.request(INSTALLATION_ROUTES.createInitialAdmin.path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function requestSignUp(body: unknown): Promise<Response> {
  return app.request('/api/auth/sign-up/email', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function withDeadline<T>(promise: Promise<T>, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined

  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), 15_000)
  })

  try {
    return await Promise.race([promise, deadline])
  } finally {
    clearTimeout(timer)
  }
}

async function countRowsIn(table: string): Promise<number> {
  const result = await sql<{ total: number }>`
    select count(*)::int as total from ${sql.ref(table)}
  `.execute(database)

  return result.rows[0]?.total ?? 0
}

async function countUsers(): Promise<number> {
  return countRowsIn('user')
}

async function breakRoleAssignment(): Promise<void> {
  await sql`
    create function fail_role_assignment() returns trigger language plpgsql as $$
    begin
      raise exception 'échec simulé de l''attribution du rôle';
    end
    $$
  `.execute(database)

  await sql`
    create trigger fail_role_assignment
    before insert on user_roles
    for each row execute function fail_role_assignment()
  `.execute(database)
}

async function repairRoleAssignment(): Promise<void> {
  await sql`drop trigger if exists fail_role_assignment on user_roles`.execute(database)
  await sql`drop function if exists fail_role_assignment()`.execute(database)
}

async function listRoleSlugsOf(email: string): Promise<string[]> {
  const result = await sql<{ slug: string }>`
    select roles.slug
    from user_roles
    join roles on roles.id = user_roles.role_id
    join "user" on "user".id = user_roles.user_id
    where "user".email = ${email}
    order by roles.slug
  `.execute(database)

  return result.rows.map((row) => row.slug)
}

async function countAdmins(): Promise<number> {
  const result = await sql<{ total: number }>`
    select count(*)::int as total
    from user_roles
    join roles on roles.id = user_roles.role_id
    where roles.slug = 'admin'
  `.execute(database)

  return result.rows[0]?.total ?? 0
}

describe('installation', () => {
  beforeEach(async () => {
    await repairRoleAssignment()
    await resetTestDatabase()
  })

  it("tant qu'aucun utilisateur n'existe, le statut d'installation répond que l'instance n'est pas installée", async () => {
    const response = await requestStatus()

    expect(response.status).toBe(200)
    expect(installationStatusResponseSchema.parse(await response.json())).toEqual({
      installed: false,
    })
  })

  it("le statut d'installation ne divulgue rien d'autre que le booléen `installed`", async () => {
    await requestInstallation(initialAdmin)

    const response = await requestStatus()
    const body = (await response.json()) as Record<string, unknown>

    expect(Object.keys(body)).toEqual(['installed'])
    expect(installationStatusResponseSchema.safeParse(body).success).toBe(true)
  })

  it("dès qu'au moins un utilisateur existe, le statut d'installation répond que l'instance est installée", async () => {
    await requestInstallation(initialAdmin)

    const response = await requestStatus()

    expect(response.status).toBe(200)
    expect(installationStatusResponseSchema.parse(await response.json())).toEqual({
      installed: true,
    })
  })

  it("la soumission crée l'utilisateur, lui attribue le rôle `admin` et ouvre une session", async () => {
    const response = await requestInstallation(initialAdmin)

    expect(response.status).toBe(201)

    const body = createInitialAdminResponseSchema.parse(await response.json())

    expect(body.user).toMatchObject({ name: initialAdmin.name, email: initialAdmin.email })
    expect(await countUsers()).toBe(1)
    expect(await listRoleSlugsOf(initialAdmin.email)).toEqual(['admin'])
    expect(response.headers.getSetCookie().join(';')).toContain('session_token')
  })

  it("la réponse de création ne divulgue pas le mot de passe de l'administrateur initial", async () => {
    const response = await requestInstallation(initialAdmin)
    const body = (await response.json()) as { user: Record<string, unknown> }

    expect(Object.keys(body)).toEqual(['user'])
    expect(Object.keys(body.user).sort()).toEqual(['email', 'id', 'name'])
  })

  it("le rôle `editor` existe après l'installation, avec les permissions `read`, `create`, `update` et `publish` sur tous les types", async () => {
    await requestInstallation(initialAdmin)

    const role = await database
      .selectFrom('roles')
      .selectAll()
      .where('slug', '=', 'editor')
      .executeTakeFirst()

    expect(role).toBeDefined()

    const permissions = await database
      .selectFrom('permissions')
      .select(['action', 'contentTypeId'])
      .where('roleId', '=', role?.id ?? '')
      .orderBy('action')
      .execute()

    expect(permissions).toEqual([
      { action: 'create', contentTypeId: null },
      { action: 'publish', contentTypeId: null },
      { action: 'read', contentTypeId: null },
      { action: 'update', contentTypeId: null },
    ])
  })

  it("le mot de passe fait au moins 12 caractères et l'endpoint refuse la soumission en deçà", async () => {
    const response = await requestInstallation({ ...initialAdmin, password: 'trop-court' })

    expect(response.status).toBe(422)
    await expect(response.json()).resolves.toMatchObject({ code: 'validation_error' })
    expect(await countUsers()).toBe(0)
  })

  it("dès qu'au moins un utilisateur existe, l'endpoint de création de l'administrateur initial répond 404, même avec une charge valide", async () => {
    const first = await requestInstallation(initialAdmin)

    expect(first.status).toBe(201)

    const second = await requestInstallation({
      name: 'Grace Hopper',
      email: 'grace@mooncello.test',
      password: 'un-autre-mot-de-passe-valide',
    })

    expect(second.status).toBe(404)
    await expect(second.json()).resolves.toMatchObject({
      code: INSTALLATION_ERROR_CODES.alreadyInstalled,
    })
    expect(await countUsers()).toBe(1)
  })

  it("deux soumissions concurrentes ne créent qu'un seul administrateur", async () => {
    const responses = await withDeadline(
      Promise.all(
        Array.from({ length: CONCURRENT_SUBMISSIONS }, (_, index) =>
          requestInstallation({ ...initialAdmin, email: `candidat-${index}@mooncello.test` }),
        ),
      ),
      `${CONCURRENT_SUBMISSIONS} soumissions concurrentes ne se sont jamais terminées`,
    )

    const statuses = responses.map((response) => response.status)

    expect(statuses.filter((status) => status === 201)).toHaveLength(1)
    expect(statuses.filter((status) => status === 404)).toHaveLength(CONCURRENT_SUBMISSIONS - 1)
    expect(await countUsers()).toBe(1)
    expect(await countAdmins()).toBe(1)
  }, 30_000)

  it("des soumissions concurrentes plus nombreuses que le pool de connexions n'épuisent pas le pool : aucune n'échoue et l'API répond encore ensuite", async () => {
    const responses = await withDeadline(
      Promise.all(
        Array.from({ length: CONCURRENT_SUBMISSIONS }, (_, index) =>
          requestInstallation({ ...initialAdmin, email: `candidat-${index}@mooncello.test` }),
        ),
      ),
      `${CONCURRENT_SUBMISSIONS} soumissions concurrentes ne se sont jamais terminées`,
    )

    expect(responses.filter((response) => response.status >= 500)).toHaveLength(0)

    const status = await withDeadline(
      requestStatus(),
      "le pool de connexions est épuisé : l'API ne répond plus après la rafale",
    )

    expect(status.status).toBe(200)
    expect(installationStatusResponseSchema.parse(await status.json())).toEqual({
      installed: true,
    })
  }, 30_000)

  it("un échec après la création de l'utilisateur ne laisse aucun utilisateur orphelin et l'installation reste possible", async () => {
    await breakRoleAssignment()

    const failed = await requestInstallation(initialAdmin)

    expect(failed.status).toBe(500)
    expect(await countUsers()).toBe(0)
    expect(await countRowsIn('account')).toBe(0)
    expect(await countRowsIn('session')).toBe(0)
    expect(installationStatusResponseSchema.parse(await (await requestStatus()).json())).toEqual({
      installed: false,
    })

    await repairRoleAssignment()

    const retried = await requestInstallation(initialAdmin)

    expect(retried.status).toBe(201)
    expect(await countUsers()).toBe(1)
    expect(await listRoleSlugsOf(initialAdmin.email)).toEqual(['admin'])
  })

  it("l'inscription libre est coupée : `POST /api/auth/sign-up/email` est refusé et l'installation continue de fonctionner", async () => {
    const signUp = await requestSignUp({
      name: 'Intrus',
      email: 'intrus@mooncello.test',
      password: 'correct-horse-battery-staple',
    })

    expect(signUp.status).toBeGreaterThanOrEqual(400)
    expect(await countUsers()).toBe(0)

    const installation = await requestInstallation(initialAdmin)

    expect(installation.status).toBe(201)
    expect(await countUsers()).toBe(1)
    expect(await listRoleSlugsOf(initialAdmin.email)).toEqual(['admin'])
  })

  it("dès qu'au moins un utilisateur existe, l'endpoint de création de l'administrateur initial répond 404, même avec une charge invalide", async () => {
    expect((await requestInstallation(initialAdmin)).status).toBe(201)

    const response = await requestInstallation({ name: '', email: 'pas-un-email', password: 'x' })

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toMatchObject({
      code: INSTALLATION_ERROR_CODES.alreadyInstalled,
    })
  })
})
