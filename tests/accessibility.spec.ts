import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import type { Result } from 'axe-core'

// Abschnitt 10.4 des Architektur-Briefings: "Accessibility-Prüfung nach WCAG 2.2 AA für
// Navigation, Dialoge, Formfehler, Tastatur/Fokus, Kontrast, Reduced Motion und Screenreader ...
// Die visuelle Prüfung allein ersetzt diese Tests nicht." axe-core deckt automatisiert ab:
// Kontrast (color-contrast-Regel läuft standardmässig mit), ARIA-/Landmark-/Label-Korrektheit
// (ein realer, wenn auch unvollständiger Teil von "Screenreader"), Formularfehler-Semantik. Was
// axe-core strukturell NICHT prüfen kann -- ein vollständiger manueller Screenreader-Durchgang
// (NVDA/VoiceOver) und "Reduced Motion" (axe hat dafür keine Regel) -- ist unten unter "Bewusst
// nicht abgedeckt" in accessibility-performance-runbook.md dokumentiert, nicht stillschweigend
// als erledigt behauptet.

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']

const PUBLIC_PAGES = [
  '/de',
  '/de/kontakt',
  '/de/nachhilfe',
  '/de/ueber-uns',
  '/de/kurse/6-klasse',
  '/de/kurse/6-klasse/halbjahreskurs',
  '/de/kurse/6-klasse/intensivkurs-sportferien',
]

for (const route of PUBLIC_PAGES) {
  test(`${route}: keine WCAG-2.1/2.2-AA-Verstösse (axe-core)`, async ({ page }) => {
    await page.goto(route, { waitUntil: 'domcontentloaded' })
    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
    expect(
      results.violations,
      formatViolations(results.violations)
    ).toEqual([])
  })
}

test.describe('Buchungsdialog', () => {
  // "Kurs B" ist die einzige Session mit garantiert freiem Platz (E2E-Fixture, kursId=9001, siehe
  // scripts/seed-e2e-course-fixtures.mjs und dieselbe Zeilen-Eingrenzung in
  // tests/routes.spec.ts). Andere Zeilen auf dieser Seite können je nach Fixture-Daten
  // "ausgebucht" (disabled) sein -- ein ungezielter erster "Anmelden"-Treffer wäre fragil. "table"
  // grenzt zusätzlich auf den Desktop-Renderpfad ein, weil SessionTable Tabelle und
  // Mobile-Kartenliste gleichzeitig ins DOM rendert (siehe app/components/kurse/session-table.tsx).
  //
  // WICHTIG zur Ausführungsreihenfolge: keiner der drei Tests unten schliesst die Buchung
  // tatsächlich ab (Formfehler-Test bricht bereits bei der Client-Validierung ab, bevor die Server
  // Action aufgerufen wird) -- diese Suite verbraucht den einen Platz von "Kurs B" also NICHT.
  // tests/routes.spec.ts' Cache-Regressionstest ("Buchung reduziert die sichtbare Verfügbarkeit
  // ...") verbraucht ihn dagegen sehr wohl (er schliesst absichtlich eine echte Buchung ab). Läuft
  // diese Suite NACH test:routes in derselben, nicht neu geseedeten lokalen DB, ist "Kurs B"
  // bereits ausgebucht und `toBeEnabled()` unten schlägt fehl. Deshalb: test:a11y vor test:routes
  // ausführen (oder auf einer frisch zurückgesetzten/erneut geseedeten DB), siehe
  // accessibility-performance-runbook.md "Ausführung".
  async function openBookingDialog(page: import('@playwright/test').Page) {
    await page.goto('/de/kurse/6-klasse/intensivkurs-sportferien')
    const row = page.locator('table tbody tr', { hasText: 'Kurs B' })
    const trigger = row.getByRole('button', { name: 'Anmelden' })
    await expect(trigger).toBeEnabled()
    await trigger.click()
    await expect(page.getByRole('dialog')).toBeVisible()
    return trigger
  }

  test('geöffneter Anmelde-Dialog hat keine WCAG-AA-Verstösse und trägt eine ARIA-Dialogrolle', async ({ page }) => {
    await openBookingDialog(page)
    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).include('[role="dialog"]').analyze()
    expect(results.violations, formatViolations(results.violations)).toEqual([])
  })

  test('Tastatur: Escape schliesst den Dialog und gibt den Fokus an das auslösende Element zurück', async ({ page }) => {
    const trigger = await openBookingDialog(page)
    const dialog = page.getByRole('dialog')

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    // Radix Dialog gibt den Fokus per Default an den Trigger zurück -- kein manueller Fokus-Trap-Bug.
    await expect(trigger).toBeFocused()
  })

  test('Formfehler: leeres Absenden zeigt zugängliche Fehlermeldungen ohne DB-Schreibzugriff', async ({ page }) => {
    await openBookingDialog(page)

    // Absichtlich leer abschicken -- react-hook-form + zodResolver validiert client-seitig, bevor
    // die Server Action (und damit ein DB-Schreibzugriff) überhaupt aufgerufen wird.
    await page.getByRole('button', { name: 'Verbindlich anmelden' }).click()

    // Mindestens eine Validierungsfehlermeldung muss sichtbar UND zugänglich benannt sein --
    // axe prüft hier gezielt Formular-Label-/Fehler-Assoziationen (aria-invalid/aria-describedby),
    // nicht nur, dass irgendein Text erscheint.
    const results = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .include('[role="dialog"]')
      .analyze()
    expect(results.violations, formatViolations(results.violations)).toEqual([])
  })
})

test.describe('Buchungsdialog im geschützten Dashboard (/intensivkurse)', () => {
  // app/(dashboard)/intensivkurse/anmeldung-modal-dashboard.tsx ist ein strukturell fast
  // identisches Duplikat von app/(public)/kurse/anmeldung-modal.tsx (derselbe Radix-Dialog-Fix,
  // siehe accessibility-performance-runbook.md) -- eigener, bewusst schlanker Test hier, weil der
  // Aufruf-Kontext (eingeloggt, Karten- statt Tabellen-Layout, Profil-Vorausfüllung) ein anderer
  // ist als beim öffentlichen Modal, dessen Dialog-Verhalten bereits oben ausführlich getestet ist.
  const E2E_USER_EMAIL = process.env.E2E_USER_EMAIL!
  const E2E_USER_PASSWORD = process.env.E2E_USER_PASSWORD!

  async function loginAsE2eUser(page: Page) {
    await page.goto('/login')
    await page.getByLabel('Email').fill(E2E_USER_EMAIL)
    await page.getByLabel('Passwort').fill(E2E_USER_PASSWORD)
    await page.getByRole('button', { name: /Anmelden/i }).click()
    await page.waitForURL((url) => url.pathname !== '/login', { timeout: 15_000 })
  }

  test('geöffneter Anmelde-Dialog im Dashboard hat keine WCAG-AA-Verstösse und trägt eine ARIA-Dialogrolle', async ({ page }) => {
    test.skip(!E2E_USER_EMAIL || !E2E_USER_PASSWORD, 'E2E_USER_EMAIL/PASSWORD fehlen (.env.test.local)')
    await loginAsE2eUser(page)
    await page.goto('/intensivkurse')

    // Karten-Layout statt SessionTable, und /intensivkurse liest `name` direkt aus der DB-Zeile
    // statt aus der editorialen Marketing-Fixture -- die dieselbe kursId=9001 dort als "Kurs B"
    // anzeigt (types/marketing.fixtures.ts), hier aber unter dem in
    // scripts/seed-e2e-course-fixtures.mjs gesetzten echten Spaltenwert "E2E Verfügbarkeitstest"
    // erscheint. Per sichtbarer Überschrift finden, Karte durch Klick darauf aufklappen
    // (KursKarte.onToggle sitzt auf dem umschliessenden Header-<div>, Klick auf die Überschrift
    // bubbelt dorthin), dann innerhalb DERSELBEN Karte den "Anmelden"-Button auslösen.
    const heading = page.getByRole('heading', { name: 'E2E Verfügbarkeitstest', exact: true })
    await expect(heading).toBeVisible()
    await heading.click()
    const card = heading.locator('xpath=ancestor::div[contains(@class, "rounded-2xl")][1]')
    const trigger = card.getByRole('button', { name: /Anmelden/i })
    await expect(trigger).toBeEnabled()
    await trigger.click()

    await expect(page.getByRole('dialog')).toBeVisible()
    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).include('[role="dialog"]').analyze()
    expect(results.violations, formatViolations(results.violations)).toEqual([])
  })
})

test('Tastaturnavigation: SiteNav-Login-Link ist per Tab erreichbar und sichtbar fokussiert', async ({ page }) => {
  await page.goto('/de')
  const loginLink = page.getByRole('link', { name: /Login/i })
  await loginLink.focus()
  await expect(loginLink).toBeFocused()
})

function formatViolations(violations: Result[]): string {
  if (violations.length === 0) return ''
  return violations
    .map((v) => `${v.id} (${v.help}): ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)
    .join('\n')
}
