import { test, expect, request, type Browser, type APIRequestContext } from '@playwright/test'

// Abschnitt 10.1/10.3 des Architektur-Briefings: Crawlt alle gerenderten öffentlichen Seiten in
// Desktop- und Mobile-Viewport, sammelt interne hrefs und schlägt bei "#", ".html"-Zielen,
// 4xx/5xx, falschem Locale-Präfix oder unbeabsichtigt lokalisierten Auth-Links fehl.
// "/login"/"/register" (unlokalisiert) und "/kurse" (Bestandsroute) sind explizite Ausnahmen.

const ENTRY_ROUTES = [
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
  '/de/kurse/4-klasse',
  '/de/kurse/5-klasse',
  '/de/kurse/6-klasse',
  '/de/kurse/1-sek',
  '/de/kurse/2-3-sek',
  '/de/kurse/bms',
  '/de/kurse/matura',
  '/de/kurse/6-klasse/halbjahreskurs',
  '/de/kurse/6-klasse/intensivkurs-sportferien',
  '/de/kurse/6-klasse/pruefungssimulation',
  '/de/kurse/6-klasse/selbststudium',
  '/de/kurse/2-3-sek/halbjahreskurs',
  '/de/kurse/2-3-sek/intensivkurs-sportferien',
  '/de/kurse/bms/intensivkurs',
  '/de/kurse/matura/halbjahreskurs',
  '/kurse',
]

const ALLOWED_UNLOCALIZED_EXCEPTIONS = new Set(['/login', '/register', '/kurse'])
const ACTIVE_LOCALES = ['de']

const viewportsToCrawl = [
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
]

// href -> Menge der Seiten, auf denen der Link gefunden wurde (für aussagekräftige Fehlermeldungen)
const collected = new Map<string, Set<string>>()

async function crawlPage(browser: Browser, route: string, viewport: { width: number; height: number }) {
  const page = await browser.newPage({ viewport })
  const response = await page.goto(route)
  if (!response || response.status() >= 400) {
    await page.close()
    throw new Error(`Einstiegsseite ${route} (Viewport ${viewport.width}x${viewport.height}) lieferte Status ${response?.status()}.`)
  }
  const hrefs = await page.$$eval('a[href]', (anchors) => anchors.map((a) => a.getAttribute('href')))
  await page.close()
  for (const href of hrefs) {
    if (!href) continue
    if (!collected.has(href)) collected.set(href, new Set())
    collected.get(href)!.add(`${route} (${viewport.width}x${viewport.height})`)
  }
}

test.beforeAll(async ({ browser }) => {
  for (const route of ENTRY_ROUTES) {
    for (const viewport of viewportsToCrawl) {
      await crawlPage(browser, route, viewport)
    }
  }
})

function describeSources(href: string): string {
  return Array.from(collected.get(href) ?? []).join(', ')
}

test('keine internen Links verwenden den "#"-Platzhalter', () => {
  const bad = Array.from(collected.keys()).filter((href) => href === '#')
  expect(bad, bad.map((href) => `"${href}" auf: ${describeSources(href)}`).join('\n')).toEqual([])
})

test('keine internen Links zeigen auf ".html"-Ziele', () => {
  const bad = Array.from(collected.keys()).filter((href) => /\.html($|[?#])/i.test(href))
  expect(bad, bad.map((href) => `"${href}" auf: ${describeSources(href)}`).join('\n')).toEqual([])
})

test('keine Links verwenden ein nicht aktiviertes Locale-Präfix', () => {
  const bad = Array.from(collected.keys()).filter((href) => {
    const match = href.match(/^\/([a-z]{2})(\/|$)/)
    if (!match) return false
    return !ACTIVE_LOCALES.includes(match[1])
  })
  expect(bad, bad.map((href) => `"${href}" auf: ${describeSources(href)}`).join('\n')).toEqual([])
})

test('/login und /register bleiben unlokalisiert verlinkt', () => {
  const bad = Array.from(collected.keys()).filter((href) => /^\/de\/(login|register)(\/|$|\?)/.test(href))
  expect(bad, bad.map((href) => `"${href}" auf: ${describeSources(href)}`).join('\n')).toEqual([])
})

test('alle internen Linkziele liefern keinen 4xx/5xx-Status', async ({ baseURL }) => {
  const apiContext: APIRequestContext = await request.newContext({ baseURL })
  const failures: string[] = []

  for (const href of collected.keys()) {
    if (href.startsWith('#')) continue // reiner In-Page-Anker, kein eigenständiges Navigationsziel
    if (href.startsWith('mailto:') || href.startsWith('tel:')) continue
    if (/^https?:\/\//i.test(href) && baseURL && !href.startsWith(baseURL)) continue // externes Ziel

    const pathOnly = href.split('#')[0]
    if (!pathOnly) continue // z.B. "#buchung" bereits oben übersprungen; leerer Rest ignorieren

    // Bewusste Ausnahmen: unlokalisierte Bestandsrouten/Auth-Seiten.
    if (ALLOWED_UNLOCALIZED_EXCEPTIONS.has(pathOnly)) continue

    const response = await apiContext.get(pathOnly).catch((error) => {
      failures.push(`"${href}" (${pathOnly}) auf: ${describeSources(href)} -- Request-Fehler: ${error.message}`)
      return null
    })
    if (response && response.status() >= 400) {
      failures.push(`"${href}" (${pathOnly}) auf: ${describeSources(href)} -- Status ${response.status()}`)
    }
  }

  await apiContext.dispose()
  expect(failures, failures.join('\n')).toEqual([])
})
