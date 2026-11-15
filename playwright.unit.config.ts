import { defineConfig } from '@playwright/test'

// Unit & Security Integration Test Configuration
// Runs pure Node/TypeScript unit and route-handler/server-action security tests
// in `tests/unit/**/*.spec.ts` without starting a Next.js webServer or browser.
export default defineConfig({
  testDir: './tests/unit',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list']],
})
