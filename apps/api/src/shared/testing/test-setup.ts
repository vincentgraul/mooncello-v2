import { afterAll } from 'vitest'
import { closeTestDatabase } from './test-database'

afterAll(async () => {
  await closeTestDatabase()
})
