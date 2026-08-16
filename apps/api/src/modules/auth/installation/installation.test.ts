import {
  createInitialAdminResponseSchema,
  INITIAL_ADMIN_PASSWORD_MAX_LENGTH,
  INITIAL_ADMIN_PASSWORD_MIN_LENGTH,
  INSTALLATION_ERROR_CODES,
  INSTALLATION_ROUTES,
  installationStatusResponseSchema,
} from '@mooncello/contracts'
import { sql } from 'kysely'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { app } from '../../../app'
import { DATABASE_POOL_MAX_CONNECTIONS, database } from '../../../shared/database/database'
import { resetTestDatabase } from '../../../shared/testing/test-database'
import { auth } from '../auth'
import { createInitialAdmin } from './installation.service'

const initialAdmin = {
  name: 'Ada Lovelace',
  email: 'ada@mooncello.test',
  password: 'correct-horse-battery-staple',
}

const CONCURRENT_SUBMISSIONS = DATABASE_POOL_MAX_CONNECTIONS + 2

async function requestStatus(): Promise<Response> {
  return app.request(INSTALLATION_ROUTES.status.path)
}

async function readStatus(): Promise<{ installed: boolean }> {
  return installationStatusResponseSchema.parse(await (await requestStatus()).json())
}

async function requestInstallation(
  body: unknown,
  headers: Record<string, string> = {},
): Promise<Response> {
  return app.request(INSTALLATION_ROUTES.createInitialAdmin.path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
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

async function requestSignIn(body: unknown): Promise<Response> {
  return app.request('/api/auth/sign-in/email', {
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

async function breakUserDeletion(): Promise<void> {
  await sql`
    create function fail_user_deletion() returns trigger language plpgsql as $$
    begin
      raise exception 'échec simulé de la suppression de l''utilisateur';
    end
    $$
  `.execute(database)

  await sql`
    create trigger fail_user_deletion
    before delete on "user"
    for each row execute function fail_user_deletion()
  `.execute(database)
}

async function repairUserDeletion(): Promise<void> {
  await sql`drop trigger if exists fail_user_deletion on "user"`.execute(database)
  await sql`drop function if exists fail_user_deletion()`.execute(database)
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

async function listSessions(): Promise<{ ipAddress: string; userAgent: string }[]> {
  const result = await sql<{ ipAddress: string; userAgent: string }>`
    select "ipAddress", "userAgent" from session
  `.execute(database)

  return result.rows
}

async function userExists(userId: string): Promise<boolean> {
  const result = await sql<{ found: boolean }>`
    select exists (select 1 from "user" where "user".id = ${userId}) as found
  `.execute(database)

  return result.rows[0]?.found ?? false
}

async function createUserWithRole(email: string, roleSlug: string): Promise<string> {
  const context = await auth.$context
  const user = await context.internalAdapter.createUser({
    name: 'Grace Hopper',
    email,
    emailVerified: false,
  })

  await context.internalAdapter.linkAccount({
    userId: user.id,
    providerId: 'credential',
    accountId: user.id,
    password: await context.password.hash(initialAdmin.password),
  })

  const role = await database
    .selectFrom('roles')
    .select('id')
    .where('slug', '=', roleSlug)
    .executeTakeFirstOrThrow()

  await database.insertInto('userRoles').values({ userId: user.id, roleId: role.id }).execute()

  return user.id
}

async function interruptInstallationAfterUserCreation(email: string): Promise<string> {
  const context = await auth.$context
  const user = await context.internalAdapter.createUser({
    name: initialAdmin.name,
    email,
    emailVerified: false,
  })

  await context.internalAdapter.linkAccount({
    userId: user.id,
    providerId: 'credential',
    accountId: user.id,
    password: await context.password.hash(initialAdmin.password),
  })

  return user.id
}

describe('installation', () => {
  beforeEach(async () => {
    await repairRoleAssignment()
    await repairUserDeletion()
    await resetTestDatabase()
  })

  it("tant qu'aucun utilisateur ne détient le rôle `admin`, le statut d'installation répond que l'instance n'est pas installée", async () => {
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

  it("dès qu'un utilisateur détient le rôle `admin`, le statut d'installation répond que l'instance est installée", async () => {
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

  it("la session ouverte à l'installation enregistre l'adresse IP et l'agent utilisateur de la requête", async () => {
    const response = await requestInstallation(initialAdmin, {
      'user-agent': 'Mooncello-Test/1.0',
      'x-forwarded-for': '203.0.113.7',
    })

    expect(response.status).toBe(201)
    expect(await listSessions()).toEqual([
      { ipAddress: '203.0.113.7', userAgent: 'Mooncello-Test/1.0' },
    ])
  })

  it("la réponse de création ne divulgue pas le mot de passe de l'administrateur initial", async () => {
    const response = await requestInstallation(initialAdmin)
    const body = (await response.json()) as { user: Record<string, unknown> }

    expect(Object.keys(body)).toEqual(['user'])
    expect(Object.keys(body.user).sort()).toEqual(['email', 'id', 'name'])
  })

  it('un email saisi en casse mixte est normalisé en minuscules et reste connectable', async () => {
    const response = await requestInstallation({ ...initialAdmin, email: 'Ada@Mooncello.Test' })

    expect(response.status).toBe(201)

    const body = createInitialAdminResponseSchema.parse(await response.json())

    expect(body.user.email).toBe('ada@mooncello.test')
    expect(await listRoleSlugsOf('ada@mooncello.test')).toEqual(['admin'])
    expect(response.headers.getSetCookie().join(';')).toContain('session_token')

    const signIn = await requestSignIn({
      email: 'Ada@Mooncello.Test',
      password: initialAdmin.password,
    })

    expect(signIn.status).toBe(200)
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

  it("le mot de passe fait entre 12 et 128 caractères et l'endpoint refuse la soumission hors de ces bornes", async () => {
    const tooShort = await requestInstallation({
      ...initialAdmin,
      password: 'a'.repeat(INITIAL_ADMIN_PASSWORD_MIN_LENGTH - 1),
    })

    expect(tooShort.status).toBe(422)
    await expect(tooShort.json()).resolves.toMatchObject({ code: 'validation_error' })

    const tooLong = await requestInstallation({
      ...initialAdmin,
      password: 'a'.repeat(INITIAL_ADMIN_PASSWORD_MAX_LENGTH + 1),
    })

    expect(tooLong.status).toBe(422)
    await expect(tooLong.json()).resolves.toMatchObject({ code: 'validation_error' })
    expect(await countUsers()).toBe(0)

    const atMaxLength = await requestInstallation({
      ...initialAdmin,
      password: 'a'.repeat(INITIAL_ADMIN_PASSWORD_MAX_LENGTH),
    })

    expect(atMaxLength.status).toBe(201)
    expect(await countUsers()).toBe(1)
  })

  it("dès qu'un utilisateur détient le rôle `admin`, l'endpoint de création de l'administrateur initial répond 404, même avec une charge valide", async () => {
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

  it("dès qu'un utilisateur détient le rôle `admin`, l'endpoint de création de l'administrateur initial répond 404, même avec une charge invalide", async () => {
    expect((await requestInstallation(initialAdmin)).status).toBe(201)

    const response = await requestInstallation({ name: '', email: 'pas-un-email', password: 'x' })

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toMatchObject({
      code: INSTALLATION_ERROR_CODES.alreadyInstalled,
    })
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
    expect(await readStatus()).toEqual({ installed: false })

    await repairRoleAssignment()

    const retried = await requestInstallation(initialAdmin)

    expect(retried.status).toBe(201)
    expect(await countUsers()).toBe(1)
    expect(await listRoleSlugsOf(initialAdmin.email)).toEqual(['admin'])
  })

  it("un échec de la compensation est journalisé, relance l'erreur d'origine et ne verrouille pas l'installation", async () => {
    await breakRoleAssignment()
    await breakUserDeletion()

    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(createInitialAdmin(initialAdmin, new Headers())).rejects.toThrow(
      /échec simulé de l'attribution du rôle/,
    )

    const journal = logged.mock.calls.flat().map(String).join('\n')

    logged.mockRestore()

    expect(journal).toContain("échec simulé de la suppression de l'utilisateur")
    expect(await countUsers()).toBe(1)
    expect(await readStatus()).toEqual({ installed: false })

    await repairUserDeletion()
    await repairRoleAssignment()

    const retried = await requestInstallation(initialAdmin)

    expect(retried.status).toBe(201)
    expect(await countUsers()).toBe(1)
    expect(await listRoleSlugsOf(initialAdmin.email)).toEqual(['admin'])
  })

  it("une installation interrompue entre la création de l'utilisateur et l'attribution du rôle laisse l'instance réinstallable, y compris avec le même email — l'utilisateur sans rôle ne verrouille pas l'installation et ne bloque pas une nouvelle tentative", async () => {
    const orphanId = await interruptInstallationAfterUserCreation(initialAdmin.email)

    expect(await countUsers()).toBe(1)
    expect(await readStatus()).toEqual({ installed: false })

    const retried = await requestInstallation(initialAdmin)

    expect(retried.status).toBe(201)

    const body = createInitialAdminResponseSchema.parse(await retried.json())

    expect(body.user.id).not.toBe(orphanId)
    expect(body.user.email).toBe(initialAdmin.email)
    expect(await countUsers()).toBe(1)
    expect(await countAdmins()).toBe(1)
    expect(await listRoleSlugsOf(initialAdmin.email)).toEqual(['admin'])
    expect(await readStatus()).toEqual({ installed: true })
  })

  it('un utilisateur portant un rôle autre que `admin` survit à une réinstallation', async () => {
    const editorId = await createUserWithRole('grace@mooncello.test', 'editor')

    const retried = await requestInstallation(initialAdmin)

    expect(retried.status).toBe(201)
    expect(await userExists(editorId)).toBe(true)
    expect(await listRoleSlugsOf('grace@mooncello.test')).toEqual(['editor'])
    expect(await countUsers()).toBe(2)
    expect(await countRowsIn('account')).toBe(2)
    expect(await countAdmins()).toBe(1)
  })

  it('un utilisateur sans rôle mais avec un email différent de celui réinstallé survit à une réinstallation', async () => {
    const untouchedId = await interruptInstallationAfterUserCreation('grace@mooncello.test')

    const retried = await requestInstallation(initialAdmin)

    expect(retried.status).toBe(201)
    expect(await userExists(untouchedId)).toBe(true)
    expect(await countUsers()).toBe(2)
    expect(await countRowsIn('account')).toBe(2)
    expect(await countAdmins()).toBe(1)
    expect(await listRoleSlugsOf(initialAdmin.email)).toEqual(['admin'])
  })

  it("une réinstallation demandée avec le même email en casse mixte nettoie tout de même l'utilisateur sans rôle laissé par la tentative interrompue", async () => {
    const orphanId = await interruptInstallationAfterUserCreation(initialAdmin.email)

    const retried = await requestInstallation({ ...initialAdmin, email: 'Ada@Mooncello.Test' })

    expect(retried.status).toBe(201)
    expect(await userExists(orphanId)).toBe(false)
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
})
