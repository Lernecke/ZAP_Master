import { defineConfig, devices } from '@playwright/test'
import { config as loadEnv } from 'dotenv'
import path from 'node:path'

// Abschnitt 10.1 des Architektur-Briefings: lokale, synthetische E2E-Zugangsdaten kommen aus
// .env.test.local (nicht eingecheckt, siehe .env.test.local.example), nicht aus .env/.env.local
// -- letztere zeigen bewusst auf das Live-Supabase-Projekt.
loadEnv({ path: path.resolve(__dirname, '.env.test.local') })

const PORT = 3000
const baseURL = `http://127.0.0.1:${PORT}`

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  // Der Produktionsserver muss ueber scripts/with-local-supabase.mjs laufen (siehe
  // package.json "start:test") -- Route-/Cache-Tests pruefen echtes Produktionsverhalten
  // (cacheComponents/use cache), nicht `next dev`.
  webServer: {
    command: 'npm run start:test',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
