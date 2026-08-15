import { z } from 'zod'
import type { FieldDefinition } from './field-definition'

export type SchemaMode = 'write' | 'read'

function baseSchemaFor(field: FieldDefinition): z.ZodType {
  switch (field.kind) {
    case 'string': {
      const schema = z.string()
      return field.maxLength === undefined ? schema : schema.max(field.maxLength)
    }
    case 'richtext':
      return z.string()
    case 'number': {
      let schema = z.number()
      if (field.min !== undefined) schema = schema.min(field.min)
      if (field.max !== undefined) schema = schema.max(field.max)
      return schema
    }
    case 'boolean':
      return z.boolean()
    case 'date':
      return z.iso.datetime()
    case 'enum':
      return z.enum(field.options as [string, ...string[]])
    case 'media':
      return z.uuid()
    case 'relation':
      return field.many ? z.array(z.uuid()) : z.uuid()
    case 'repeatable':
      return z.array(buildEntrySchema(field.of, 'write'))
  }
}

export function buildEntrySchema(fields: FieldDefinition[], mode: SchemaMode = 'write') {
  const shape: Record<string, z.ZodType> = {}

  for (const field of fields) {
    const base = baseSchemaFor(field)
    shape[field.name] = mode === 'write' && field.required ? base : base.optional()
  }

  return z.strictObject(shape)
}
