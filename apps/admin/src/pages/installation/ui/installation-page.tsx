import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Container,
  Flex,
  Text,
  Title,
} from '@empreint/ui'
import { INITIAL_ADMIN_PASSWORD_MIN_LENGTH } from '@mooncello/contracts'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { apiClient, installationStatusQueryOptions } from '@/shared/api'
import { ROUTES } from '@/shared/config'
import {
  INITIAL_ADMIN_FORM_DEFAULTS,
  type InitialAdminForm,
  initialAdminFormSchema,
  toCreateInitialAdminRequest,
} from '../model/initial-admin-form'
import { isAlreadyInstalledError } from '../model/installation-error'
import { TextField } from './text-field'

function firstErrorMessage(errors: readonly unknown[]): string | undefined {
  for (const error of errors) {
    if (typeof error === 'string') {
      return error
    }

    if (typeof error === 'object' && error !== null && 'message' in error) {
      const { message } = error as { message: unknown }

      if (typeof message === 'string') {
        return message
      }
    }
  }

  return undefined
}

export function InstallationPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (values: InitialAdminForm) =>
      apiClient.createInitialAdmin(toCreateInitialAdminRequest(values)),
    onSuccess: () => {
      queryClient.setQueryData(installationStatusQueryOptions.queryKey, { installed: true })
      void navigate({ to: ROUTES.dashboard })
    },
    onError: (error) => {
      if (isAlreadyInstalledError(error)) {
        queryClient.setQueryData(installationStatusQueryOptions.queryKey, { installed: true })
        void navigate({ to: ROUTES.connexion })
      }
    },
  })

  const form = useForm({
    defaultValues: INITIAL_ADMIN_FORM_DEFAULTS,
    validators: {
      onChange: initialAdminFormSchema,
      onSubmit: initialAdminFormSchema,
    },
    onSubmit: ({ value }) => {
      mutation.mutate(value)
    },
  })

  return (
    <Container size="1">
      <Flex direction="column" justify="center" gap="6" style={{ minHeight: '100vh' }}>
        <Card>
          <CardHeader>
            <Flex direction="column" gap="2">
              <Title as="h1" size="6">
                Installation de Mooncello
              </Title>
              <Text as="p" size="2">
                Créez le compte administrateur initial pour prendre la main sur cette instance.
              </Text>
            </Flex>
          </CardHeader>

          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault()
              event.stopPropagation()
              void form.handleSubmit()
            }}
          >
            <CardBody>
              <Flex direction="column" gap="4">
                <form.Field name="name">
                  {(field) => (
                    <TextField
                      name={field.name}
                      label="Nom"
                      autoComplete="name"
                      value={field.state.value}
                      error={
                        field.state.meta.isTouched
                          ? firstErrorMessage(field.state.meta.errors)
                          : undefined
                      }
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                    />
                  )}
                </form.Field>

                <form.Field name="email">
                  {(field) => (
                    <TextField
                      name={field.name}
                      type="email"
                      label="Adresse email"
                      autoComplete="email"
                      value={field.state.value}
                      error={
                        field.state.meta.isTouched
                          ? firstErrorMessage(field.state.meta.errors)
                          : undefined
                      }
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                    />
                  )}
                </form.Field>

                <form.Field name="password">
                  {(field) => (
                    <TextField
                      name={field.name}
                      type="password"
                      label="Mot de passe"
                      hint={`Au moins ${INITIAL_ADMIN_PASSWORD_MIN_LENGTH} caractères.`}
                      autoComplete="new-password"
                      value={field.state.value}
                      error={
                        field.state.meta.isTouched
                          ? firstErrorMessage(field.state.meta.errors)
                          : undefined
                      }
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                    />
                  )}
                </form.Field>

                <form.Field name="passwordConfirmation">
                  {(field) => (
                    <TextField
                      name={field.name}
                      type="password"
                      label="Confirmation du mot de passe"
                      autoComplete="new-password"
                      value={field.state.value}
                      error={
                        field.state.meta.isTouched
                          ? firstErrorMessage(field.state.meta.errors)
                          : undefined
                      }
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                    />
                  )}
                </form.Field>

                {mutation.isError && !isAlreadyInstalledError(mutation.error) ? (
                  <Text as="p" size="2" role="alert">
                    {mutation.error.message}
                  </Text>
                ) : null}
              </Flex>
            </CardBody>

            <CardFooter>
              <form.Subscribe selector={(state) => state.isSubmitting}>
                {(isSubmitting) => (
                  <Button
                    type="submit"
                    variant="primary"
                    size="3"
                    disabled={isSubmitting || mutation.isPending}
                  >
                    Créer l'administrateur
                  </Button>
                )}
              </form.Subscribe>
            </CardFooter>
          </form>
        </Card>
      </Flex>
    </Container>
  )
}
