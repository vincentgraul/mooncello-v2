import { closeTestDatabase, prepareTestDatabase } from './test-database'

export async function setup(): Promise<void> {
  await prepareTestDatabase()
  await closeTestDatabase()
}
