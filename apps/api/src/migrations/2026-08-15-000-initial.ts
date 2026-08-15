import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`create extension if not exists "pgcrypto"`.execute(db)

  await db.schema
    .createTable('roles')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('slug', 'text', (col) => col.notNull().unique())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('is_system', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .execute()

  await db.schema
    .createTable('content_types')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('slug', 'text', (col) => col.notNull().unique())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('fields', 'jsonb', (col) => col.notNull().defaultTo(sql`'[]'::jsonb`))
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .execute()

  await db.schema
    .createTable('permissions')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('role_id', 'uuid', (col) => col.notNull().references('roles.id').onDelete('cascade'))
    .addColumn('action', 'text', (col) => col.notNull())
    .addColumn('content_type_id', 'uuid', (col) =>
      col.references('content_types.id').onDelete('cascade'),
    )
    .addCheckConstraint(
      'permissions_action_check',
      sql`action in ('read', 'create', 'update', 'delete', 'publish')`,
    )
    .execute()

  await db.schema
    .createIndex('permissions_role_idx')
    .on('permissions')
    .columns(['role_id'])
    .execute()

  await db.schema
    .createTable('user_roles')
    .addColumn('user_id', 'text', (col) => col.notNull())
    .addColumn('role_id', 'uuid', (col) => col.notNull().references('roles.id').onDelete('cascade'))
    .addPrimaryKeyConstraint('user_roles_pkey', ['user_id', 'role_id'])
    .execute()

  await db.schema
    .createTable('entries')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('document_id', 'uuid', (col) => col.notNull())
    .addColumn('content_type_id', 'uuid', (col) =>
      col.notNull().references('content_types.id').onDelete('cascade'),
    )
    .addColumn('status', 'text', (col) => col.notNull())
    .addColumn('data', 'jsonb', (col) => col.notNull().defaultTo(sql`'{}'::jsonb`))
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('published_at', 'timestamptz')
    .addCheckConstraint('entries_status_check', sql`status in ('draft', 'published')`)
    .addUniqueConstraint('entries_document_status_unique', ['document_id', 'status'])
    .execute()

  await db.schema
    .createIndex('entries_content_type_status_idx')
    .on('entries')
    .columns(['content_type_id', 'status'])
    .execute()

  await sql`create index entries_data_gin on entries using gin (data jsonb_path_ops)`.execute(db)

  await db.schema
    .createTable('entry_relations')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('from_entry_id', 'uuid', (col) =>
      col.notNull().references('entries.id').onDelete('cascade'),
    )
    .addColumn('to_entry_id', 'uuid', (col) =>
      col.notNull().references('entries.id').onDelete('cascade'),
    )
    .addColumn('field_name', 'text', (col) => col.notNull())
    .execute()

  await db.schema
    .createIndex('entry_relations_to_idx')
    .on('entry_relations')
    .columns(['to_entry_id'])
    .execute()

  await db.schema
    .createTable('media')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('filename', 'text', (col) => col.notNull())
    .addColumn('mime_type', 'text', (col) => col.notNull())
    .addColumn('size_bytes', 'bigint', (col) => col.notNull())
    .addColumn('width', 'integer')
    .addColumn('height', 'integer')
    .addColumn('storage_key', 'text', (col) => col.notNull().unique())
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .execute()

  await sql`
    insert into roles (slug, name, is_system)
    values ('admin', 'Administrateur', true), ('public', 'Public', true)
  `.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('media').ifExists().execute()
  await db.schema.dropTable('entry_relations').ifExists().execute()
  await db.schema.dropTable('entries').ifExists().execute()
  await db.schema.dropTable('user_roles').ifExists().execute()
  await db.schema.dropTable('permissions').ifExists().execute()
  await db.schema.dropTable('content_types').ifExists().execute()
  await db.schema.dropTable('roles').ifExists().execute()
}
