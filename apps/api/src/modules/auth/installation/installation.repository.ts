import type { Kysely } from 'kysely'
import { sql } from 'kysely'
import type { Database } from '../../../shared/database/schema'

const INSTALLATION_LOCK_KEY = 5_712_003

export async function lockInstallation(executor: Kysely<Database>): Promise<void> {
  await sql`select pg_advisory_xact_lock(${sql.lit(INSTALLATION_LOCK_KEY)})`.execute(executor)
}

export async function hasAnyUser(executor: Kysely<Database>): Promise<boolean> {
  const result = await sql<{ installed: boolean }>`
    select exists (select 1 from "user") as installed
  `.execute(executor)

  return result.rows[0]?.installed ?? false
}

export async function findRoleIdBySlug(
  executor: Kysely<Database>,
  slug: string,
): Promise<string | undefined> {
  const role = await executor
    .selectFrom('roles')
    .select('id')
    .where('slug', '=', slug)
    .executeTakeFirst()

  return role?.id
}

export async function assignRoleToUser(
  executor: Kysely<Database>,
  userId: string,
  roleId: string,
): Promise<void> {
  await executor.insertInto('userRoles').values({ userId, roleId }).execute()
}
