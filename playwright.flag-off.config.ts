import { defineConfig, devices } from '@playwright/test'
import { config as loadEnv } from 'dotenv'
import path from 'node:path'

// Eigene Konfiguration fuer den Abschnitt-10.4-Feature-Flag-Rollback-Test (siehe
// lib/marketing-flag.ts, tests/marketing-flag-rollback.spec.ts). Getrennt von playwright.config.ts,
// weil der Rollback-Modus einen eigenen Server-Start mit MARKETING_SITE_LIVE=false braucht --
// playwright.config.ts startet genau einen webServer-Prozess fuer alle darin enthaltenen
// Test-Dateien, und der normale Routen-/Link-Gate-Lauf soll weiterhin gegen den Live-Default
// (Flag an) pruefen.
loadEnv({ path: path.resolve(__dirname, '.env.test.local') })

// Gleicher Port wie playwright.config.ts: beide Laeufe finden nacheinander statt (eigenes
// npm-Script, siehe package.json "test:flag-rollback"), nie gleichzeitig -- ein zweiter Port waere
// nur zusaetzliche, unbenutzte Komplexitaet (next start liest PORT nicht in jeder Version
// zuverlaessig ohne "-p").
const PORT = 3000
const baseURL = `http://127.0.0.1:${PORT}`

export default defineConfig({
  testDir: './tests',
  testMatch: 'marketing-flag-rollback.spec.ts',
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
  webServer: {
    // scripts/with-local-supabase.mjs spreadet sein eigenes process.env in den next-start-
    // Kindprozess (siehe dortiger Kommentar) -- MARKETING_SITE_LIVE unten reicht deshalb bis zur
    // Middleware durch.
    command: 'npm run start:test',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      MARKETING_SITE_LIVE: 'false',
    },
  },
})
