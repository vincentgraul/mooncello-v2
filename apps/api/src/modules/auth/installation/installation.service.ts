import type { CreateInitialAdminRequest, CreateInitialAdminResponse } from '@mooncello/contracts'
import { createInitialAdminResponseSchema } from '@mooncello/contracts'
import type { Kysely } from 'kysely'
import { database } from '../../../shared/database/database'
import type { Database } from '../../../shared/database/schema'
import { auth } from '../auth'
import {
  assignRoleToUser,
  findRoleIdBySlug,
  hasUserWithRole,
  listUsersWithoutRole,
  lockInstallation,
} from './installation.repository'

const ADMIN_ROLE_SLUG = 'admin'

const SESSION_CONTEXT_HEADERS = ['user-agent', 'x-forwarded-for']

export class AlreadyInstalledError extends Error {
  constructor() {
    super("L'instance est déjà installée")
    this.name = 'AlreadyInstalledError'
  }
}

export type InitialAdminCreation = {
  body: CreateInitialAdminResponse
  sessionCookies: string[]
}

type CreatedAdmin = {
  id: string
  name: string
  email: string
}

export async function isInstalled(): Promise<boolean> {
  return hasUserWithRole(database, ADMIN_ROLE_SLUG)
}

async function createAdminAccount(input: CreateInitialAdminRequest): Promise<CreatedAdmin> {
  const context = await auth.$context
  const passwordHash = await context.password.hash(input.password)

  const user = await context.internalAdapter.createUser({
    name: input.name,
    email: input.email,
    emailVerified: false,
  })

  await context.internalAdapter.linkAccount({
    userId: user.id,
    providerId: 'credential',
    accountId: user.id,
    password: passwordHash,
  })

  return { id: user.id, name: user.name, email: user.email }
}

async function removeUserAccount(userId: string): Promise<void> {
  const context = await auth.$context
  await context.internalAdapter.deleteUser(userId)
}

async function removeInterruptedInstallations(executor: Kysely<Database>): Promise<void> {
  for (const userId of await listUsersWithoutRole(executor)) {
    await removeUserAccount(userId)
  }
}

async function compensateAdminAccount(userId: string, cause: unknown): Promise<void> {
  try {
    await removeUserAccount(userId)
  } catch (compensationError) {
    console.error(
      `Compensation impossible : l'utilisateur ${userId} reste sans rôle et devra être nettoyé à la prochaine installation`,
      compensationError,
      cause,
    )
  }
}

function toSessionContextHeaders(requestHeaders: Headers): Headers {
  const headers = new Headers()

  for (const name of SESSION_CONTEXT_HEADERS) {
    const value = requestHeaders.get(name)

    if (value !== null) {
      headers.set(name, value)
    }
  }

  return headers
}

async function openSession(
  input: CreateInitialAdminRequest,
  requestHeaders: Headers,
): Promise<string[]> {
  const { headers } = await auth.api.signInEmail({
    body: { email: input.email, password: input.password },
    headers: toSessionContextHeaders(requestHeaders),
    returnHeaders: true,
  })

  return headers.getSetCookie()
}

export async function createInitialAdmin(
  input: CreateInitialAdminRequest,
  requestHeaders: Headers,
): Promise<InitialAdminCreation> {
  let createdUserId: string | undefined

  try {
    return await database.transaction().execute(async (transaction) => {
      await lockInstallation(transaction)

      if (await hasUserWithRole(transaction, ADMIN_ROLE_SLUG)) {
        throw new AlreadyInstalledError()
      }

      const adminRoleId = await findRoleIdBySlug(transaction, ADMIN_ROLE_SLUG)

      if (!adminRoleId) {
        throw new Error(`Le rôle système « ${ADMIN_ROLE_SLUG} » est introuvable`)
      }

      await removeInterruptedInstallations(transaction)

      const admin = await createAdminAccount(input)
      createdUserId = admin.id

      await assignRoleToUser(transaction, admin.id, adminRoleId)

      return {
        body: createInitialAdminResponseSchema.parse({
          user: { id: admin.id, name: admin.name, email: admin.email },
        }),
        sessionCookies: await openSession(input, requestHeaders),
      }
    })
  } catch (error) {
    if (createdUserId) {
      await compensateAdminAccount(createdUserId, error)
    }

    throw error
  }
}
