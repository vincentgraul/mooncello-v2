import {
  type CreateInitialAdminRequest,
  createInitialAdminRequestSchema,
} from '@mooncello/contracts'
import { z } from 'zod'

export const initialAdminFormSchema = createInitialAdminRequestSchema
  .extend({
    passwordConfirmation: z.string().min(1, 'Confirmez le mot de passe'),
  })
  .refine((values) => values.password === values.passwordConfirmation, {
    message: 'La confirmation ne correspond pas au mot de passe',
    path: ['passwordConfirmation'],
  })

export type InitialAdminForm = z.infer<typeof initialAdminFormSchema>

export const INITIAL_ADMIN_FORM_DEFAULTS: InitialAdminForm = {
  name: '',
  email: '',
  password: '',
  passwordConfirmation: '',
}

export function toCreateInitialAdminRequest(values: InitialAdminForm): CreateInitialAdminRequest {
  return {
    name: values.name,
    email: values.email,
    password: values.password,
  }
}
