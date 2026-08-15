import { z } from 'zod'

export const FIELD_KINDS = [
  'string',
  'richtext',
  'number',
  'boolean',
  'date',
  'enum',
  'media',
  'relation',
  'repeatable',
] as const

export type FieldKind = (typeof FIELD_KINDS)[number]

type CommonField = {
  name: string
  label: string
  required: boolean
}

export type FieldDefinition =
  | (CommonField & { kind: 'string'; maxLength?: number })
  | (CommonField & { kind: 'richtext' })
  | (CommonField & { kind: 'number'; min?: number; max?: number })
  | (CommonField & { kind: 'boolean' })
  | (CommonField & { kind: 'date' })
  | (CommonField & { kind: 'enum'; options: string[] })
  | (CommonField & { kind: 'media' })
  | (CommonField & { kind: 'relation'; to: string; many: boolean })
  | (CommonField & { kind: 'repeatable'; of: FieldDefinition[] })

const commonShape = {
  name: z.string().regex(/^[a-z][a-zA-Z0-9]*$/, 'Le nom du champ doit être en camelCase'),
  label: z.string().min(1),
  required: z.boolean().default(false),
}

export const fieldDefinitionSchema: z.ZodType<FieldDefinition, unknown> = z.lazy(() =>
  z.discriminatedUnion('kind', [
    z.object({
      ...commonShape,
      kind: z.literal('string'),
      maxLength: z.number().int().positive().optional(),
    }),
    z.object({ ...commonShape, kind: z.literal('richtext') }),
    z.object({
      ...commonShape,
      kind: z.literal('number'),
      min: z.number().optional(),
      max: z.number().optional(),
    }),
    z.object({ ...commonShape, kind: z.literal('boolean') }),
    z.object({ ...commonShape, kind: z.literal('date') }),
    z.object({
      ...commonShape,
      kind: z.literal('enum'),
      options: z.array(z.string().min(1)).min(1),
    }),
    z.object({ ...commonShape, kind: z.literal('media') }),
    z.object({
      ...commonShape,
      kind: z.literal('relation'),
      to: z.string().min(1),
      many: z.boolean().default(false),
    }),
    z.object({
      ...commonShape,
      kind: z.literal('repeatable'),
      of: z.array(fieldDefinitionSchema).min(1),
    }),
  ]),
)

export const fieldsSchema = z.array(fieldDefinitionSchema).superRefine((fields, ctx) => {
  const seen = new Set<string>()
  for (const [index, field] of fields.entries()) {
    if (seen.has(field.name)) {
      ctx.addIssue({
        code: 'custom',
        path: [index, 'name'],
        message: `Le champ "${field.name}" est défini plusieurs fois`,
      })
    }
    seen.add(field.name)
  }
})
