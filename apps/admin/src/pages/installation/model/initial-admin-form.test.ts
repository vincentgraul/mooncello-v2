import { INITIAL_ADMIN_PASSWORD_MIN_LENGTH } from '@mooncello/contracts'
import { describe, expect, it } from 'vitest'
import {
  type InitialAdminForm,
  initialAdminFormSchema,
  toCreateInitialAdminRequest,
} from './initial-admin-form'

const VALID_FORM: InitialAdminForm = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  password: 'correct-horse-battery-staple',
  passwordConfirmation: 'correct-horse-battery-staple',
}

describe('initialAdminFormSchema', () => {
  it('accepte un formulaire complet et cohérent', () => {
    expect(initialAdminFormSchema.safeParse(VALID_FORM).success).toBe(true)
  })

  it(`refuse un mot de passe de moins de ${INITIAL_ADMIN_PASSWORD_MIN_LENGTH} caractères`, () => {
    const tooShort = 'a'.repeat(INITIAL_ADMIN_PASSWORD_MIN_LENGTH - 1)
    const result = initialAdminFormSchema.safeParse({
      ...VALID_FORM,
      password: tooShort,
      passwordConfirmation: tooShort,
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.path[0])).toContain('password')
  })

  it('La confirmation doit correspondre', () => {
    const result = initialAdminFormSchema.safeParse({
      ...VALID_FORM,
      passwordConfirmation: 'un-autre-mot-de-passe',
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.path[0])).toContain('passwordConfirmation')
  })

  it('refuse un email invalide', () => {
    const result = initialAdminFormSchema.safeParse({ ...VALID_FORM, email: 'pas-un-email' })

    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.path[0])).toContain('email')
  })

  it('refuse un nom vide', () => {
    const result = initialAdminFormSchema.safeParse({ ...VALID_FORM, name: '' })

    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.path[0])).toContain('name')
  })
})

describe('toCreateInitialAdminRequest', () => {
  it("la confirmation n'est pas envoyée à l'API", () => {
    expect(toCreateInitialAdminRequest(VALID_FORM)).toEqual({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'correct-horse-battery-staple',
    })
  })
})
