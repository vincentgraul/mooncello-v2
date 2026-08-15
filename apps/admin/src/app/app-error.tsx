import { Container, Flex, Text, Title } from '@empreint/ui'

export function AppError() {
  return (
    <Container size="1">
      <Flex direction="column" justify="center" gap="4" style={{ minHeight: '100vh' }}>
        <Title as="h1" size="6">
          API injoignable
        </Title>
        <Text as="p" size="2">
          Impossible de contacter l'API de Mooncello. Vérifiez qu'elle est démarrée, puis rechargez
          la page.
        </Text>
      </Flex>
    </Container>
  )
}
