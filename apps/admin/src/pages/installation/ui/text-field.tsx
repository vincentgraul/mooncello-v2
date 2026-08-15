import { Input, InputField, InputLabel, InputMessage } from '@empreint/ui'
import type { ComponentProps } from 'react'

export type TextFieldProps = Omit<ComponentProps<'input'>, 'id'> & {
  label: string
  hint?: string
  error?: string
}

export function TextField({ label, hint, error, ...rest }: TextFieldProps) {
  const message = error ?? hint

  return (
    <Input status={error ? 'error' : 'default'}>
      <InputLabel>{label}</InputLabel>
      <InputField {...rest} />
      {message ? <InputMessage>{message}</InputMessage> : null}
    </Input>
  )
}
