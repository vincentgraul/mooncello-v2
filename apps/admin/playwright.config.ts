import { defineConfig, devices } from '@playwright/test'
import { E2E_DATABASE_URL } from './e2e/config'

const ADMIN_PORT = 5174
const API_PORT = 3399

const adminOrigin = `http://localhost:${ADMIN_PORT}`
const apiOrigin = `http://localhost:${API_PORT}`

const e2eEnv = {
  DATABASE_URL: E2E_DATABASE_URL,
  BETTER_AUTH_SECRET: 'secret-de-test-e2e-de-32-caracteres-minimum',
  BETTER_AUTH_URL: apiOrigin,
  API_PORT: String(API_PORT),
  ADMIN_ORIGIN: adminOrigin,
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  use: {
    baseURL: adminOrigin,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'bun run test:e2e:db && bun run --filter @mooncello/api start',
      url: `${apiOrigin}/health`,
      env: e2eEnv,
      reuseExistingServer: false,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: `bun run dev --port ${ADMIN_PORT} --strictPort`,
      url: adminOrigin,
      env: { VITE_API_URL: apiOrigin },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
})
