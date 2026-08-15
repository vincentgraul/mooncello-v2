import { Container, Flex, Text, Title } from '@empreint/ui'

export function ConnexionPage() {
  return (
    <Container size="1">
      <Flex direction="column" justify="center" gap="4" style={{ minHeight: '100vh' }}>
        <Title as="h1" size="6">
          Connexion
        </Title>
        <Text as="p" size="2">
          Cet écran sera implémenté par la story « connexion ».
        </Text>
      </Flex>
    </Container>
  )
}
