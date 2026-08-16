import { expect, test } from '@playwright/test'
import pg from 'pg'
import { E2E_DATABASE_URL } from './config'

const ADMIN = {
  name: 'Ada Lovelace',
  email: 'Ada.Lovelace@Example.COM',
  password: 'correct-horse-battery-staple',
}

const NORMALIZED_ADMIN_EMAIL = ADMIN.email.toLowerCase()

async function queryDatabase<T extends pg.QueryResultRow>(
  text: string,
  values: unknown[] = [],
): Promise<T[]> {
  const client = new pg.Client({ connectionString: E2E_DATABASE_URL })
  await client.connect()

  try {
    const { rows } = await client.query<T>(text, values)

    return rows
  } finally {
    await client.end()
  }
}

function listAdminRoleHolders() {
  return queryDatabase<{ userId: string }>(
    'select user_roles.user_id as "userId" from user_roles join roles on roles.id = user_roles.role_id where roles.slug = $1',
    ['admin'],
  )
}

test.describe.configure({ mode: 'serial' })

test("Tant qu'aucun utilisateur n'existe, toute route de l'admin redirige vers `/installation`", async ({
  page,
}) => {
  expect(await queryDatabase('select id from "user"')).toHaveLength(0)
  expect(await listAdminRoleHolders()).toHaveLength(0)

  await page.goto('/')

  await expect(page).toHaveURL('/installation')
  await expect(page.getByRole('heading', { name: 'Installation de Mooncello' })).toBeVisible()
})

test("La soumission crée l'utilisateur, lui attribue le rôle `admin`, ouvre une session et redirige vers le tableau de bord", async ({
  page,
}) => {
  await page.goto('/installation')

  await page.getByLabel('Nom').fill(ADMIN.name)
  await page.getByLabel('Adresse email').fill(ADMIN.email)
  await page.getByLabel('Mot de passe', { exact: true }).fill(ADMIN.password)
  await page.getByLabel('Confirmation du mot de passe').fill(ADMIN.password)

  await page.getByRole('button', { name: "Créer l'administrateur" }).click()

  await expect(page).toHaveURL('/')
  await expect(page.getByRole('heading', { name: 'Mooncello', exact: true })).toBeVisible()

  const users = await queryDatabase<{ id: string; email: string }>('select id, email from "user"')

  expect(users).toHaveLength(1)
  expect(users[0]?.email).toBe(NORMALIZED_ADMIN_EMAIL)

  const roles = await queryDatabase<{ slug: string }>(
    'select roles.slug from user_roles join roles on roles.id = user_roles.role_id where user_roles.user_id = $1',
    [users[0]?.id],
  )

  expect(roles.map((role) => role.slug)).toEqual(['admin'])

  const sessionCookie = (await page.context().cookies()).find((cookie) =>
    cookie.name.includes('session_token'),
  )

  expect(sessionCookie, 'le navigateur doit avoir stocké le cookie de session').toBeDefined()
  expect(sessionCookie?.value).not.toBe('')

  const sessions = await queryDatabase<{ token: string }>('select token from session')

  expect(sessions).toHaveLength(1)
  expect(decodeURIComponent(String(sessionCookie?.value))).toContain(String(sessions[0]?.token))
})

test("Dès qu'un utilisateur détient le rôle `admin`, `/installation` redirige vers `/connexion`", async ({
  page,
}) => {
  expect(await listAdminRoleHolders()).toHaveLength(1)

  await page.goto('/installation')

  await expect(page).toHaveURL('/connexion')
})
