import { test, expect, type Page } from '@playwright/test'

// Abschnitt 10.1/10.3 des Architektur-Briefings: Routentabelle fuer alle aktivierten
// oeffentlichen DE-Seiten, /kurse, Auth-Seiten und geschuetzte Bestandsrouten. Deckt Redirects mit
// Status/Location, Rollen-/Auth-Trennung und die SiteNav-/Login-CTA-Invariante ab.
//
// Bewusst NICHT abgedeckt in dieser ersten Fassung: End-to-End-Nachweis fuer die
// updateTag()/refresh()-Cache-Regression aus Abschnitt 7 (dafuer muesste eine echte
// Preisaenderung ueber die Admin-Maske ausgeloest und die oeffentliche Seite ungecached neu
// geladen werden -- das gehoert in eine eigene, spaetere Erweiterung dieser Suite, siehe
// Abschlussbericht).

const E2E_USER_EMAIL = process.env.E2E_USER_EMAIL!
const E2E_USER_PASSWORD = process.env.E2E_USER_PASSWORD!
const E2E_ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL!
const E2E_ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD!

test.beforeAll(() => {
  for (const [name, value] of Object.entries({ E2E_USER_EMAIL, E2E_USER_PASSWORD, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD })) {
    if (!value) {
      throw new Error(`${name} fehlt. .env.test.local.example nach .env.test.local kopieren und scripts/seed-e2e-users.mjs ausfuehren.`)
    }
  }
})

async function loginAs(page: Page, email: string, password: string, callbackUrl?: string) {
  const target = callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : '/login'
  await page.goto(target)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Passwort').fill(password)
  await page.getByRole('button', { name: /Anmelden/i }).click()
  await page.waitForURL((url) => url.pathname !== '/login', { timeout: 15_000 })
}

/**
 * requireAdmin()/requireContentManager() rufen redirect() innerhalb einer unter Cache Components
 * (PPR) dynamisch/gestreamt gerenderten Seite auf: die anfängliche Server-Antwort für die
 * ANGEFORDERTE (nicht erlaubte) Route committet bereits mit HTTP 200, bevor der redirect() im
 * gestreamten Teil ausgeführt wird und den Client per Skript zur Zielroute navigiert. page.url()
 * unmittelbar nach page.goto() zeigt deshalb kurzzeitig noch die ursprüngliche URL -- erst nach
 * Abschluss dieser clientseitigen Navigation stimmt sie mit dem tatsächlichen Redirect-Ziel
 * überein. Kein Sicherheitsproblem (siehe Body-Assertion in den aufrufenden Tests), aber ein
 * Timing-Detail, das hier einmal zentral abgefangen wird.
 */
async function waitForRedirectAway(page: Page, from: string) {
  await page.waitForURL((url) => url.pathname !== from, { timeout: 15_000 })
}

// ---------------------------------------------------------------------------
// 1) Oeffentliche DE-Marketingseiten: erfolgreich erreichbar.
// ---------------------------------------------------------------------------

const publicMarketingRoutes = [
  '/de',
  '/de/kontakt',
  '/de/impressum',
  '/de/datenschutz',
  '/de/lerncoaching',
  '/de/nachhilfe',
  '/de/distance-learning',
  '/de/pruefungssimulation',
  '/de/tipps',
  '/de/ueber-uns',
]

for (const route of publicMarketingRoutes) {
  test(`öffentliche Marketingseite ${route} lädt erfolgreich`, async ({ page }) => {
    const response = await page.goto(route)
    expect(response?.status(), `${route} sollte 200 liefern`).toBe(200)
  })
}

const audienceOverviewRoutes = ['4-klasse', '5-klasse', '6-klasse', '1-sek', '2-3-sek', 'bms', 'matura'].map(
  (slug) => `/de/kurse/${slug}`
)

for (const route of audienceOverviewRoutes) {
  test(`Zielgruppen-Hauptseite ${route} lädt erfolgreich`, async ({ page }) => {
    const response = await page.goto(route)
    expect(response?.status(), `${route} sollte 200 liefern`).toBe(200)
  })
}

const courseDetailRoutes = [
  '/de/kurse/4-klasse/halbjahreskurs',
  '/de/kurse/4-klasse/lerncamp-sportferien',
  '/de/kurse/5-klasse/halbjahreskurs',
  '/de/kurse/6-klasse/halbjahreskurs',
  '/de/kurse/6-klasse/intensivkurs-sportferien',
  '/de/kurse/6-klasse/pruefungssimulation',
  '/de/kurse/6-klasse/selbststudium',
  '/de/kurse/1-sek/vorkurs',
  '/de/kurse/1-sek/lerncamp-sportferien',
  '/de/kurse/2-3-sek/halbjahreskurs',
  '/de/kurse/2-3-sek/intensivkurs-sportferien',
  '/de/kurse/2-3-sek/pruefungssimulation',
  '/de/kurse/2-3-sek/selbststudium',
  '/de/kurse/bms/intensivkurs',
  '/de/kurse/bms/pruefungssimulation',
  '/de/kurse/bms/selbststudium',
  '/de/kurse/matura/halbjahreskurs',
  '/de/kurse/matura/intensivwoche',
]

for (const route of courseDetailRoutes) {
  test(`Kursdetailseite ${route} lädt erfolgreich`, async ({ page }) => {
    const response = await page.goto(route)
    expect(response?.status(), `${route} sollte 200 liefern`).toBe(200)
  })
}

// Bekannte, dokumentierte Einschränkung (siehe Kommentar bei dynamicParams in
// kurse/[audience]/page.tsx): `dynamicParams = false` ist inkompatibel mit
// `nextConfig.cacheComponents`, daher kann der anfängliche HTTP-Status unter PPR 200 bleiben,
// obwohl notFound() korrekt greift und die reguläre Next.js-404-UI gerendert wird. Diese Tests
// prüfen deshalb den tatsächlichen Inhalt statt eines garantierten HTTP-Status.
test('unbekannte Zielgruppe rendert die 404-Seite', async ({ page }) => {
  await page.goto('/de/kurse/unbekannte-zielgruppe')
  await expect(page.getByText('404')).toBeVisible()
})

test('unbekannte Angebotskombination rendert die 404-Seite', async ({ page }) => {
  await page.goto('/de/kurse/4-klasse/nicht-vorhandenes-angebot')
  await expect(page.getByText('404')).toBeVisible()
})

test('bestehende unlokalisierte Route /kurse bleibt erreichbar', async ({ page }) => {
  const response = await page.goto('/kurse')
  expect(response?.status()).toBe(200)
})

// ---------------------------------------------------------------------------
// 2) Root-Redirect: "/" -> "/de" (next-intl, localePrefix "always").
// ---------------------------------------------------------------------------

test('"/" leitet auf "/de" weiter', async ({ page }) => {
  const response = await page.goto('/')
  expect(response?.status()).toBe(200)
  expect(new URL(page.url()).pathname).toBe('/de')
})

// ---------------------------------------------------------------------------
// 3) Auth-Seiten sind unlokalisiert und anonym erreichbar.
// ---------------------------------------------------------------------------

test('/login ist anonym erreichbar und unlokalisiert', async ({ page }) => {
  const response = await page.goto('/login')
  expect(response?.status()).toBe(200)
  expect(new URL(page.url()).pathname).toBe('/login')
})

test('/register ist anonym erreichbar und unlokalisiert', async ({ page }) => {
  const response = await page.goto('/register')
  expect(response?.status()).toBe(200)
  expect(new URL(page.url()).pathname).toBe('/register')
})

// ---------------------------------------------------------------------------
// 4) Anonyme Redirects fuer geschuetzte Routen: exakter callbackUrl-Pfad.
// ---------------------------------------------------------------------------

const protectedRoutesForAnonymousRedirect = [
  '/dashboard',
  '/profil',
  '/trainer',
  '/uebungen',
  '/pruefung',
  '/aufsaetze',
  '/intensivkurse',
  '/materialien',
  '/materialien/langzeitgymi',
  '/arbeitszeiten',
  '/dashboard/finanzen',
  '/dashboard/arbeitszeiten',
]

for (const route of protectedRoutesForAnonymousRedirect) {
  test(`anonymer Zugriff auf ${route} leitet mit exaktem callbackUrl nach /login`, async ({ page }) => {
    await page.goto(route)
    const url = new URL(page.url())
    expect(url.pathname).toBe('/login')
    expect(url.searchParams.get('callbackUrl')).toBe(route)
  })
}

// ---------------------------------------------------------------------------
// 5) Authentifizierte Redirects: /login, /register -> /dashboard; validierter callbackUrl hat
//    Vorrang.
// ---------------------------------------------------------------------------

test.describe('authentifiziert als E2E-Nutzer (Rolle "user")', () => {
  test.use({ storageState: undefined })

  test('/login ohne Rücksprungziel führt nach erfolgreichem Login zu /dashboard', async ({ page }) => {
    await loginAs(page, E2E_USER_EMAIL, E2E_USER_PASSWORD)
    expect(new URL(page.url()).pathname).toBe('/dashboard')
  })

  test('gültiger interner callbackUrl wird nach Login exakt übernommen', async ({ page }) => {
    await loginAs(page, E2E_USER_EMAIL, E2E_USER_PASSWORD, '/profil')
    expect(new URL(page.url()).pathname).toBe('/profil')
  })

  test('bereits angemeldeter Nutzer wird von /login sofort weitergeleitet (callbackUrl übernommen)', async ({ page }) => {
    await loginAs(page, E2E_USER_EMAIL, E2E_USER_PASSWORD)
    await page.goto('/login?callbackUrl=/profil')
    expect(new URL(page.url()).pathname).toBe('/profil')
  })

  test('externe/protokoll-relative callbackUrl wird verworfen (Open-Redirect-Schutz)', async ({ page }) => {
    await loginAs(page, E2E_USER_EMAIL, E2E_USER_PASSWORD)
    await page.goto('/login?callbackUrl=' + encodeURIComponent('//evil.example.com'))
    const url = new URL(page.url())
    expect(url.hostname).not.toBe('evil.example.com')
    expect(url.pathname).toBe('/dashboard')
  })

  test('Nicht-Admin wird von /dashboard/finanzen weggeleitet', async ({ page }) => {
    await loginAs(page, E2E_USER_EMAIL, E2E_USER_PASSWORD)
    await page.goto('/dashboard/finanzen')
    await waitForRedirectAway(page, '/dashboard/finanzen')
    const url = new URL(page.url())
    expect(url.pathname).toBe('/dashboard')
    expect(url.searchParams.get('error')).toBe('unauthorized')
    await expect(page.getByText('Bruttogewinn')).toHaveCount(0)
  })

  test('Nicht-Admin wird von /dashboard/arbeitszeiten weggeleitet', async ({ page }) => {
    await loginAs(page, E2E_USER_EMAIL, E2E_USER_PASSWORD)
    await page.goto('/dashboard/arbeitszeiten')
    await waitForRedirectAway(page, '/dashboard/arbeitszeiten')
    const url = new URL(page.url())
    expect(url.pathname).toBe('/dashboard')
    expect(url.searchParams.get('error')).toBe('unauthorized')
  })

  test('Nicht-Lehrperson wird von /arbeitszeiten (Lehrpersonen-Dashboard) weggeleitet', async ({ page }) => {
    await loginAs(page, E2E_USER_EMAIL, E2E_USER_PASSWORD)
    await page.goto('/arbeitszeiten')
    await waitForRedirectAway(page, '/arbeitszeiten')
    const url = new URL(page.url())
    expect(url.pathname).toBe('/dashboard')
    expect(url.searchParams.get('error')).toBe('unauthorized')
  })

  test('Zugriff auf einen geschützten Materialbereich ohne aktiven Grant zeigt "Kein Zugang"', async ({ page }) => {
    await loginAs(page, E2E_USER_EMAIL, E2E_USER_PASSWORD)
    const response = await page.goto('/materialien/bms')
    expect(response?.status()).toBe(200)
    expect(new URL(page.url()).pathname).toBe('/materialien/bms')
    await expect(page.getByText('Kein Zugang')).toBeVisible()
  })

  test('callbackUrl aus einem geschützten Materialbereich führt nach Login dorthin zurück', async ({ page }) => {
    await page.goto('/materialien/bms')
    expect(new URL(page.url()).pathname).toBe('/login')
    await page.getByLabel('Email').fill(E2E_USER_EMAIL)
    await page.getByLabel('Passwort').fill(E2E_USER_PASSWORD)
    await page.getByRole('button', { name: /Anmelden/i }).click()
    await page.waitForURL((url) => url.pathname !== '/login', { timeout: 15_000 })
    expect(new URL(page.url()).pathname).toBe('/materialien/bms')
  })
})

test.describe('authentifiziert als E2E-Admin', () => {
  test('Admin erreicht /dashboard/finanzen', async ({ page }) => {
    await loginAs(page, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD)
    const response = await page.goto('/dashboard/finanzen')
    expect(response?.status()).toBe(200)
    expect(new URL(page.url()).pathname).toBe('/dashboard/finanzen')
  })

  test('Admin erreicht /dashboard/arbeitszeiten', async ({ page }) => {
    await loginAs(page, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD)
    const response = await page.goto('/dashboard/arbeitszeiten')
    expect(response?.status()).toBe(200)
    expect(new URL(page.url()).pathname).toBe('/dashboard/arbeitszeiten')
  })

  test('Admin sieht das Admin-Panel im geschützten Materialbereich', async ({ page }) => {
    await loginAs(page, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD)
    await page.goto('/materialien/bms')
    await expect(page.getByText('Zugriff verwalten (Admin)')).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// 6) SiteNav: genau einmal gerendert, Login-CTA zeigt immer auf /login (nie lokalisiert).
// ---------------------------------------------------------------------------

test('SiteNav rendert genau einmal auf der Startseite mit Login-Link zu /login', async ({ page }) => {
  await page.goto('/de')
  const nav = page.locator('nav')
  await expect(nav).toHaveCount(1)
  const loginLink = page.getByRole('link', { name: /login/i })
  await expect(loginLink).toHaveAttribute('href', '/login')
})

test('SiteNav erscheint nicht auf /login', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('link', { name: '4.Kl' })).toHaveCount(0)
})
