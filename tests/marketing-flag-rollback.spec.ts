import { test, expect } from '@playwright/test'

// Abschnitt 10.4 des Architektur-Briefings: "Die neuen Marketingrouten werden über ein
// serverseitiges Release-Flag aktiviert. Der Rollback schaltet zunächst auf die bisherige Start-/
// Kursroute zurück und entfernt keine neuen Daten." Läuft ausschliesslich über
// playwright.flag-off.config.ts (npm run test:flag-rollback), das den Server mit
// MARKETING_SITE_LIVE=false startet -- siehe lib/marketing-flag.ts für die genaue, dokumentierte
// Abweichung ("bisherige Startroute" existiert nicht mehr, Fallback ist einheitlich /kurse).
//
// Bewusst getrennt von tests/routes.spec.ts: der normale Gate-Lauf prüft den Live-Default
// (Flag an); dieser eine Testlauf prüft ausschliesslich den Rollback-Zustand.

test.describe('Marketing-Release-Flag: Rollback-Modus (MARKETING_SITE_LIVE=false)', () => {
  test('Root "/" faellt auf /kurse zurueck statt auf die neue Startseite', async ({ page }) => {
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' })
    expect(response?.status()).toBeLessThan(400)
    await expect(page).toHaveURL(/\/kurse\/?$/)
  })

  test('Lokalisierte Marketingroute faellt auf /kurse zurueck', async ({ page }) => {
    const response = await page.goto('/de/ueber-uns', { waitUntil: 'domcontentloaded' })
    expect(response?.status()).toBeLessThan(400)
    await expect(page).toHaveURL(/\/kurse\/?$/)
  })

  test('Lokalisierte Kurs-Detailroute faellt ebenfalls auf /kurse zurueck', async ({ page }) => {
    const response = await page.goto('/de/kurse/6-klasse', { waitUntil: 'domcontentloaded' })
    expect(response?.status()).toBeLessThan(400)
    await expect(page).toHaveURL(/\/kurse\/?$/)
  })

  test('Bestandsroute /kurse bleibt unveraendert direkt erreichbar (kein Redirect-Loop)', async ({ page }) => {
    const response = await page.goto('/kurse', { waitUntil: 'domcontentloaded' })
    expect(response?.status()).toBe(200)
    await expect(page).toHaveURL(/\/kurse\/?$/)
  })

  test('Login bleibt unlokalisiert und vom Flag unbeeinflusst erreichbar', async ({ page }) => {
    const response = await page.goto('/login', { waitUntil: 'domcontentloaded' })
    expect(response?.status()).toBe(200)
    await expect(page).toHaveURL(/\/login$/)
  })

  // KEIN Laufzeit-Test fuer die sitemap.xml-Gating-Logik in app/sitemap.ts hier: sitemap.ts hat
  // keine dynamische API (kein cookies()/headers()/searchParams), Next.js rendert es deshalb genau
  // wie robots.ts (dessen NEXT_PUBLIC_ALLOW_INDEXING aus demselben Grund erst nach einem Rebuild
  // wirkt) einmal statisch beim Build und liefert diesen Stand danach unveraendert aus -- ein
  // `next start` gegen einen mit MARKETING_SITE_LIVE=true gebauten Output zeigt deshalb weiterhin
  // die volle Liste, auch wenn der Server selbst mit MARKETING_SITE_LIVE=false laeuft. Das ist bei
  // diesem Projekt (cacheComponents: true, "export const dynamic" ist in diesem Modus laut
  // Abschnitt 7 des Architektur-Briefings deaktiviert) erwartetes Verhalten, kein Bug in
  // app/sitemap.ts. Der sicherheitsrelevante Teil -- der tatsaechliche Redirect -- ist dynamisch
  // pro Request (siehe Tests oben) und braucht deshalb keinen Rebuild. Siehe
  // runbook-marketing-cutover.md fuer die dokumentierte Konsequenz: die Sitemap-Aktualisierung
  // erfordert einen Redeploy/Rebuild mit dem neuen Wert, der Redirect-Schutz nicht.
})
