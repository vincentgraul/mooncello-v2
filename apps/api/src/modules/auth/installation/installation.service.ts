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

export async function isInstalled(): Promise<boolean> {
  return hasAnyUser(database)
}

export async function createInitialAdmin(
  input: CreateInitialAdminRequest,
): Promise<InitialAdminCreation> {
  return database.transaction().execute(async (transaction) => {
    await lockInstallation(transaction)

    if (await hasAnyUser(transaction)) {
      throw new AlreadyInstalledError()
    }

    const adminRoleId = await findRoleIdBySlug(transaction, ADMIN_ROLE_SLUG)

    if (!adminRoleId) {
      throw new Error(`Le rôle système « ${ADMIN_ROLE_SLUG} » est introuvable`)
    }

    const { headers, response } = await auth.api.signUpEmail({
      body: { name: input.name, email: input.email, password: input.password },
      returnHeaders: true,
    })

    await assignRoleToUser(transaction, response.user.id, adminRoleId)

    return {
      body: createInitialAdminResponseSchema.parse({
        user: {
          id: response.user.id,
          name: response.user.name,
          email: response.user.email,
        },
      }),
      sessionCookies: headers.getSetCookie(),
    }
  })
}
