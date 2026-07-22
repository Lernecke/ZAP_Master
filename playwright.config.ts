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
    // Abschnitt 10.4 "Browser-/Mobile-Testmatrix": testMatch beschraenkt dieses Projekt bewusst
    // auf tests/performance.spec.ts, damit die uebrigen Suiten (routes/links/accessibility/
    // flag-rollback) nicht versehentlich ein zweites Mal unter einem Mobile-Viewport laufen und
    // sich die Laufzeit des Haupt-Gates verdoppelt. `npm run test:performance` (kein
    // Projekt-Filter) fuehrt performance.spec.ts dadurch automatisch unter "chromium" (Desktop,
    // matcht per Default alles) UND "mobile-chrome" aus -- die tatsaechliche, wenn auch bewusst
    // kleine Matrix; Firefox/WebKit sind (noch) nicht installiert, siehe
    // accessibility-performance-runbook.md.
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] }, testMatch: /performance\.spec\.ts/ },
  ],
  // Der Produktionsserver muss ueber scripts/with-local-supabase.mjs laufen (siehe
  // package.json "start:test") -- Route-/Cache-Tests pruefen echtes Produktionsverhalten
  // (cacheComponents/use cache), nicht `next dev`.
  //
  // reuseExistingServer bewusst IMMER false, nicht nur in CI: ein wiederverwendeter `next start`-
  // Prozess haelt den 'use cache'-Katalog (lib/kurse/catalog.ts) und den kompilierten Code eines
  // fruehen Laufs im Speicher -- Preis-/Cache-Regressionstests wuerden dann gegen einen veralteten
  // Stand pruefen, unabhaengig vom aktuellen Build oder DB-Inhalt. Dieses Gate soll bei jedem Lauf
  // reproduzierbar von einem frischen Serverstart aus pruefen.
  webServer: {
    command: 'npm run start:test',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
