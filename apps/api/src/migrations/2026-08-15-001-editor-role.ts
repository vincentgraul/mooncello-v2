import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`insert into roles (slug, name, is_system) values ('editor', 'Éditeur', false)`.execute(
    db,
  )

  await sql`
    insert into permissions (role_id, action, content_type_id)
    select roles.id, action, null
    from roles
    cross join unnest(array['read', 'create', 'update', 'publish']) as action
    where roles.slug = 'editor'
  `.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`delete from roles where slug = 'editor'`.execute(db)
}
