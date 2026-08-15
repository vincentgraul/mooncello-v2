import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    env: {
      DATABASE_URL: 'postgres://mooncello:mooncello@localhost:5433/mooncello_test',
      BETTER_AUTH_SECRET: 'test-secret-0123456789abcdef0123456789',
      BETTER_AUTH_URL: 'http://localhost:3333',
      ADMIN_ORIGIN: 'http://localhost:5173',
    },
  },
})
