import { Input, InputField, InputLabel, InputMessage } from '@empreint/ui'
import type { ComponentProps } from 'react'

export type TextFieldProps = Omit<ComponentProps<'input'>, 'id'> & {
  id: string
  label: string
  hint?: string
  error?: string
}

export function TextField({ id, label, hint, error, ...rest }: TextFieldProps) {
  const message = error ?? hint

  return (
    <Input status={error ? 'error' : 'default'}>
      <InputLabel htmlFor={id}>{label}</InputLabel>
      <InputField id={id} aria-invalid={error ? true : undefined} {...rest} />
      {message ? <InputMessage>{message}</InputMessage> : null}
    </Input>
  )
}
