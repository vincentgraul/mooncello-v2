import {
  createInitialAdminResponseSchema,
  INSTALLATION_ERROR_CODES,
  INSTALLATION_ROUTES,
  installationStatusResponseSchema,
} from '@mooncello/contracts'
import { sql } from 'kysely'
import { beforeEach, describe, expect, it } from 'vitest'
import { app } from '../../../app'
import { database } from '../../../shared/database/database'
import { resetTestDatabase } from '../../../shared/testing/test-database'

const initialAdmin = {
  name: 'Ada Lovelace',
  email: 'ada@mooncello.test',
  password: 'correct-horse-battery-staple',
}

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

async function countUsers(): Promise<number> {
  const result = await sql<{ total: number }>`select count(*)::int as total from "user"`.execute(
    database,
  )

  return result.rows[0]?.total ?? 0
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
    expect(body.user.id).not.toHaveLength(0)
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
    const [first, second] = await Promise.all([
      requestInstallation({ ...initialAdmin, email: 'first@mooncello.test' }),
      requestInstallation({ ...initialAdmin, email: 'second@mooncello.test' }),
    ])

    expect([first.status, second.status].sort()).toEqual([201, 404])
    expect(await countUsers()).toBe(1)
    expect(await countAdmins()).toBe(1)
  })
})
