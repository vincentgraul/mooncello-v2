import { fieldsSchema } from '@mooncello/field-types'
import { z } from 'zod'

export const contentTypeSlugSchema = z
  .string()
  .regex(/^[a-z][a-z0-9-]*$/, 'Le slug doit être en kebab-case')

export const contentTypeSchema = z.strictObject({
  id: z.uuid(),
  slug: contentTypeSlugSchema,
  name: z.string().min(1),
  fields: fieldsSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})

export type ContentType = z.infer<typeof contentTypeSchema>

export const createContentTypeRequestSchema = z.strictObject({
  slug: contentTypeSlugSchema,
  name: z.string().min(1),
  fields: fieldsSchema,
})

export type CreateContentTypeRequest = z.infer<typeof createContentTypeRequestSchema>

export const createContentTypeResponseSchema = contentTypeSchema

export type CreateContentTypeResponse = z.infer<typeof createContentTypeResponseSchema>

export const updateContentTypeRequestSchema = z.strictObject({
  name: z.string().min(1).optional(),
  fields: fieldsSchema.optional(),
})

export type UpdateContentTypeRequest = z.infer<typeof updateContentTypeRequestSchema>

export const listContentTypesResponseSchema = z.array(contentTypeSchema)

export type ListContentTypesResponse = z.infer<typeof listContentTypesResponseSchema>
