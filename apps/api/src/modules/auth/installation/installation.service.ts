import type { CreateInitialAdminRequest, CreateInitialAdminResponse } from '@mooncello/contracts'
import { createInitialAdminResponseSchema } from '@mooncello/contracts'
import { database } from '../../../shared/database/database'
import { auth } from '../auth'
import {
  assignRoleToUser,
  findRoleIdBySlug,
  hasAnyUser,
  lockInstallation,
} from './installation.repository'

const ADMIN_ROLE_SLUG = 'admin'

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
  return hasAnyUser(database)
}

async function createAdminAccount(input: CreateInitialAdminRequest): Promise<CreatedAdmin> {
  const context = await auth.$context
  const passwordHash = await context.password.hash(input.password)

  const user = await context.internalAdapter.createUser({
    name: input.name,
    email: input.email.toLowerCase(),
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

async function removeAdminAccount(userId: string): Promise<void> {
  const context = await auth.$context
  await context.internalAdapter.deleteUser(userId)
}

async function openSession(input: CreateInitialAdminRequest): Promise<string[]> {
  const { headers } = await auth.api.signInEmail({
    body: { email: input.email, password: input.password },
    returnHeaders: true,
  })

  return headers.getSetCookie()
}

export async function createInitialAdmin(
  input: CreateInitialAdminRequest,
): Promise<InitialAdminCreation> {
  let createdUserId: string | undefined

  try {
    return await database.transaction().execute(async (transaction) => {
      await lockInstallation(transaction)

      if (await hasAnyUser(transaction)) {
        throw new AlreadyInstalledError()
      }

      const adminRoleId = await findRoleIdBySlug(transaction, ADMIN_ROLE_SLUG)

      if (!adminRoleId) {
        throw new Error(`Le rôle système « ${ADMIN_ROLE_SLUG} » est introuvable`)
      }

      const admin = await createAdminAccount(input)
      createdUserId = admin.id

      await assignRoleToUser(transaction, admin.id, adminRoleId)

      return {
        body: createInitialAdminResponseSchema.parse({
          user: { id: admin.id, name: admin.name, email: admin.email },
        }),
        sessionCookies: await openSession(input),
      }
    })
  } catch (error) {
    if (createdUserId) {
      await removeAdminAccount(createdUserId)
    }

    throw error
  }
}
