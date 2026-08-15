import { z } from 'zod'

export const permissionActionSchema = z.enum(['read', 'create', 'update', 'delete', 'publish'])

export type PermissionAction = z.infer<typeof permissionActionSchema>

export const permissionSchema = z.strictObject({
  action: permissionActionSchema,
  contentTypeId: z.uuid().nullable(),
})

export type Permission = z.infer<typeof permissionSchema>

export const roleSchema = z.strictObject({
  id: z.uuid(),
  slug: z.string().regex(/^[a-z][a-z0-9-]*$/, 'Le slug doit être en kebab-case'),
  name: z.string().min(1),
  isSystem: z.boolean(),
  permissions: z.array(permissionSchema),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})

export type Role = z.infer<typeof roleSchema>

export const createRoleRequestSchema = z.strictObject({
  slug: z.string().regex(/^[a-z][a-z0-9-]*$/),
  name: z.string().min(1),
  permissions: z.array(permissionSchema),
})

export type CreateRoleRequest = z.infer<typeof createRoleRequestSchema>

export const updateRoleRequestSchema = z.strictObject({
  name: z.string().min(1).optional(),
  permissions: z.array(permissionSchema).optional(),
})

export type UpdateRoleRequest = z.infer<typeof updateRoleRequestSchema>

export const listRolesResponseSchema = z.array(roleSchema)

export type ListRolesResponse = z.infer<typeof listRolesResponseSchema>
