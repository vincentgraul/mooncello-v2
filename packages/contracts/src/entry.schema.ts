import { z } from 'zod'

export const entryStatusSchema = z.enum(['draft', 'published'])

export type EntryStatus = z.infer<typeof entryStatusSchema>

export const entryDataSchema = z.record(z.string(), z.unknown())

export type EntryData = z.infer<typeof entryDataSchema>

export const entrySchema = z.strictObject({
  id: z.uuid(),
  documentId: z.uuid(),
  contentTypeId: z.uuid(),
  status: entryStatusSchema,
  data: entryDataSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  publishedAt: z.iso.datetime().nullable(),
})

export type Entry = z.infer<typeof entrySchema>

export const createEntryRequestSchema = z.strictObject({
  data: entryDataSchema,
})

export type CreateEntryRequest = z.infer<typeof createEntryRequestSchema>

export const updateEntryRequestSchema = z.strictObject({
  data: entryDataSchema,
})

export type UpdateEntryRequest = z.infer<typeof updateEntryRequestSchema>

export const listEntriesQuerySchema = z.strictObject({
  status: entryStatusSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25),
})

export type ListEntriesQuery = z.infer<typeof listEntriesQuerySchema>

export const listEntriesResponseSchema = z.strictObject({
  items: z.array(entrySchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
})

export type ListEntriesResponse = z.infer<typeof listEntriesResponseSchema>

export const publishEntryResponseSchema = entrySchema

export type PublishEntryResponse = z.infer<typeof publishEntryResponseSchema>
