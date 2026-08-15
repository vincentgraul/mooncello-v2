import { describe, expect, it } from 'vitest'
import { buildEntrySchema } from './build-entry-schema'
import type { FieldDefinition } from './field-definition'

const articleFields: FieldDefinition[] = [
  { kind: 'string', name: 'title', label: 'Titre', required: true, maxLength: 120 },
  { kind: 'richtext', name: 'body', label: 'Corps', required: false },
  { kind: 'date', name: 'publishedAt', label: 'Publié le', required: false },
]

const questionFields: FieldDefinition[] = [
  { kind: 'richtext', name: 'text', label: 'Énoncé', required: true },
  {
    kind: 'repeatable',
    name: 'answers',
    label: 'Réponses',
    required: true,
    of: [
      { kind: 'string', name: 'label', label: 'Libellé', required: true },
      { kind: 'boolean', name: 'isCorrect', label: 'Correcte', required: true },
    ],
  },
]

describe('buildEntrySchema', () => {
  it('accepte une entrée conforme', () => {
    const result = buildEntrySchema(articleFields).safeParse({
      title: 'Les capitales',
      body: '<p>…</p>',
    })

    expect(result.success).toBe(true)
  })

  it('refuse un champ requis manquant', () => {
    const result = buildEntrySchema(articleFields).safeParse({ body: '<p>…</p>' })

    expect(result.success).toBe(false)
  })

  it('refuse une clé inconnue', () => {
    const result = buildEntrySchema(articleFields).safeParse({ title: 'Hello', auteur: 'moi' })

    expect(result.success).toBe(false)
  })

  it('refuse un type invalide', () => {
    const result = buildEntrySchema(articleFields).safeParse({
      title: 'Hello',
      publishedAt: 'pas-une-date',
    })

    expect(result.success).toBe(false)
  })

  it('valide les champs répétables imbriqués', () => {
    const result = buildEntrySchema(questionFields).safeParse({
      text: 'Quelle est la capitale du Portugal ?',
      answers: [
        { label: 'Lisbonne', isCorrect: true },
        { label: 'Porto', isCorrect: false },
      ],
    })

    expect(result.success).toBe(true)
  })

  it('tolère les champs requis manquants en mode lecture', () => {
    const result = buildEntrySchema(articleFields, 'read').safeParse({ body: '<p>…</p>' })

    expect(result.success).toBe(true)
  })
})
