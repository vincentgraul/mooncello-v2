import { defineConfig } from 'vitest/config'

const testEnv = {
  DATABASE_URL:
    process.env.TEST_DATABASE_URL ?? 'postgres://mooncello:mooncello@localhost:5433/mooncello_test',
  BETTER_AUTH_SECRET: 'test-secret-0123456789abcdef0123456789',
  BETTER_AUTH_URL: 'http://localhost:3333',
  ADMIN_ORIGIN: 'http://localhost:5173',
}

Object.assign(process.env, testEnv)

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    env: testEnv,
    globalSetup: ['src/shared/testing/global-setup.ts'],
    setupFiles: ['src/shared/testing/test-setup.ts'],
    fileParallelism: false,
  },
})
