import type { Kysely } from 'kysely'
import { sql } from 'kysely'
import type { Database } from '../../../shared/database/schema'

const INSTALLATION_LOCK_KEY = 5_712_003

export async function lockInstallation(executor: Kysely<Database>): Promise<void> {
  await sql`select pg_advisory_xact_lock(${sql.lit(INSTALLATION_LOCK_KEY)})`.execute(executor)
}

export async function hasUserWithRole(
  executor: Kysely<Database>,
  roleSlug: string,
): Promise<boolean> {
  const result = await sql<{ found: boolean }>`
    select exists (
      select 1
      from user_roles
      join roles on roles.id = user_roles.role_id
      join "user" on "user".id = user_roles.user_id
      where roles.slug = ${roleSlug}
    ) as found
  `.execute(executor)

  return result.rows[0]?.found ?? false
}

export async function listUsersWithoutRole(executor: Kysely<Database>): Promise<string[]> {
  const result = await sql<{ id: string }>`
    select "user".id
    from "user"
    where not exists (select 1 from user_roles where user_roles.user_id = "user".id)
  `.execute(executor)

  return result.rows.map((row) => row.id)
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
