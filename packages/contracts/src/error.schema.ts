import { z } from 'zod'

export const apiErrorSchema = z.strictObject({
  code: z.string(),
  message: z.string(),
  issues: z
    .array(
      z.strictObject({
        path: z.array(z.union([z.string(), z.number()])),
        message: z.string(),
      }),
    )
    .optional(),
})

export type ApiError = z.infer<typeof apiErrorSchema>
