import { z } from 'zod'

export const mediaSchema = z.strictObject({
  id: z.uuid(),
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  url: z.string(),
  createdAt: z.iso.datetime(),
})

export type Media = z.infer<typeof mediaSchema>

export const uploadMediaResponseSchema = mediaSchema

export type UploadMediaResponse = z.infer<typeof uploadMediaResponseSchema>

export const listMediaResponseSchema = z.strictObject({
  items: z.array(mediaSchema),
  total: z.number().int().nonnegative(),
})

export type ListMediaResponse = z.infer<typeof listMediaResponseSchema>
