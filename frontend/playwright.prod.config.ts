import { defineConfig, devices } from '@playwright/test'

/**
 * Smoke tests of the production build (`make e2e-prod`): the static build behind Caddy, as it
 * ships — no Vite dev server, no StrictMode re-run of effects. Only `e2e/*.prod.ts`.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.prod.ts',
  outputDir: './test-results/prod',
  globalSetup: './e2e/global-setup.ts',
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:8080',
    locale: 'ru-RU',
    timezoneId: 'Asia/Almaty',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
