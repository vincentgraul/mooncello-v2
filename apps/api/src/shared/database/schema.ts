import type { FieldDefinition } from '@mooncello/field-types'
import type { ColumnType, Generated, JSONColumnType } from 'kysely'

type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>

export type RoleTable = {
  id: Generated<string>
  slug: string
  name: string
  isSystem: Generated<boolean>
  createdAt: Generated<Timestamp>
  updatedAt: Generated<Timestamp>
}

export type PermissionTable = {
  id: Generated<string>
  roleId: string
  action: string
  contentTypeId: string | null
}

export type UserRoleTable = {
  userId: string
  roleId: string
}

export type ContentTypeTable = {
  id: Generated<string>
  slug: string
  name: string
  fields: JSONColumnType<FieldDefinition[], string, string>
  createdAt: Generated<Timestamp>
  updatedAt: Generated<Timestamp>
}

export type EntryTable = {
  id: Generated<string>
  documentId: string
  contentTypeId: string
  status: 'draft' | 'published'
  data: JSONColumnType<Record<string, unknown>, string, string>
  createdAt: Generated<Timestamp>
  updatedAt: Generated<Timestamp>
  publishedAt: Timestamp | null
}

export type EntryRelationTable = {
  id: Generated<string>
  fromEntryId: string
  toEntryId: string
  fieldName: string
}

export type MediaTable = {
  id: Generated<string>
  filename: string
  mimeType: string
  sizeBytes: number
  width: number | null
  height: number | null
  storageKey: string
  createdAt: Generated<Timestamp>
}

export type Database = {
  roles: RoleTable
  permissions: PermissionTable
  userRoles: UserRoleTable
  contentTypes: ContentTypeTable
  entries: EntryTable
  entryRelations: EntryRelationTable
  media: MediaTable
}
