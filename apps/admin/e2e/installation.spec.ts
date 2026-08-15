import { expect, test } from '@playwright/test'
import pg from 'pg'

const DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? 'postgres://mooncello:mooncello@localhost:5433/mooncello_e2e'

const ADMIN = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  password: 'correct-horse-battery-staple',
}

async function queryDatabase<T extends pg.QueryResultRow>(
  text: string,
  values: unknown[] = [],
): Promise<T[]> {
  const client = new pg.Client({ connectionString: DATABASE_URL })
  await client.connect()

  try {
    const { rows } = await client.query<T>(text, values)

    return rows
  } finally {
    await client.end()
  }
}

test.describe.configure({ mode: 'serial' })

test("Tant qu'aucun utilisateur n'existe, toute route de l'admin redirige vers `/installation`", async ({
  page,
}) => {
  expect(await queryDatabase('select id from "user"')).toHaveLength(0)

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
  expect(users[0]?.email).toBe(ADMIN.email)

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

test("Dès qu'au moins un utilisateur existe, `/installation` redirige vers `/connexion`", async ({
  page,
}) => {
  expect(await queryDatabase('select id from "user"')).toHaveLength(1)

  await page.goto('/installation')

  await expect(page).toHaveURL('/connexion')
})
