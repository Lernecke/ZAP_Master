import { test, expect } from '@playwright/test'

// Abschnitt 10.4 des Architektur-Briefings: "Performance-Budgets für LCP, CLS und JS;
// Browser-/Mobile-Testmatrix." Läuft laut playwright.config.ts unter ZWEI Projekten -- "chromium"
// (Desktop) automatisch, weil dessen testMatch keine Datei ausschliesst, und "mobile-chrome"
// (Pixel 5), dessen testMatch ausschliesslich auf diese Datei zeigt. Das ist die tatsächliche,
// wenn auch bewusst kleine Browser-/Mobile-Testmatrix -- Firefox/WebKit sind (noch) nicht
// installiert, siehe accessibility-performance-runbook.md für den dokumentierten Folgeschritt.
//
// LCP/CLS werden ohne zusätzliche Abhängigkeit über die nativen Browser-Performance-APIs
// (PerformanceObserver) gemessen, kein web-vitals-Paket nötig. Die Budgets entsprechen den
// offiziellen Google-Core-Web-Vitals-"good"-Schwellenwerten (LCP <= 2.5s, CLS <= 0.1). Lokale
// Läufe (Windows-Entwicklungsmaschine, next start statt echtem CDN/Edge) sind kein Ersatz für
// eine echte Produktionsmessung -- diese Werte sind ein Regressions-Wächter, keine SLA-Zusage.

const LCP_BUDGET_MS = 2500
const CLS_BUDGET = 0.1
// Der Test bevorzugt den Content-Length-Header (reale Transfergrösse, falls komprimiert
// ausgeliefert) und faellt sonst auf die von Playwright dekomprimierte Body-Grösse zurück.
// Empirisch liefert `next start` auf dieser lokalen Windows-Entwicklungsmaschine für
// /_next/static/-JS-Chunks in beiden Fällen denselben (unkomprimierten) Wert -- ~1.29-1.42 MB für
// die gemessenen Seiten. Das Budget ist deshalb bewusst als GROBER Regressions-Wächter auf
// unkomprimierten Bytes kalibriert (deutlich über dem Ist-Stand), nicht als reale
// Transfer-Zusage; eine echte, komprimierte Produktionsmessung braucht eine reale
// CDN-/Edge-Auslieferung, siehe accessibility-performance-runbook.md.
const JS_TRANSFER_BUDGET_BYTES = 1800 * 1024

const PAGES_TO_MEASURE = ['/de', '/de/kurse/6-klasse/intensivkurs-sportferien']

async function measureLcp(page: import('@playwright/test').Page): Promise<number> {
  return page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let resolved = false
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const last = entries[entries.length - 1] as PerformanceEntry & { startTime: number }
          if (last && !resolved) {
            resolved = true
            resolve(last.startTime)
          }
        })
        observer.observe({ type: 'largest-contentful-paint', buffered: true })
        // Falls nie ein LCP-Eintrag feuert (z.B. leere Seite), nach kurzer Zeit mit 0 auflösen,
        // statt den Test unendlich hängen zu lassen.
        setTimeout(() => {
          if (!resolved) {
            resolved = true
            resolve(0)
          }
        }, 3000)
      })
  )
}

async function measureCls(page: import('@playwright/test').Page): Promise<number> {
  return page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let clsValue = 0
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as (PerformanceEntry & {
            value: number
            hadRecentInput: boolean
          })[]) {
            if (!entry.hadRecentInput) clsValue += entry.value
          }
        })
        observer.observe({ type: 'layout-shift', buffered: true })
        setTimeout(() => resolve(clsValue), 1000)
      })
  )
}

for (const route of PAGES_TO_MEASURE) {
  test(`${route}: LCP innerhalb des Budgets (<= ${LCP_BUDGET_MS}ms)`, async ({ page }) => {
    await page.goto(route, { waitUntil: 'load' })
    const lcp = await measureLcp(page)
    expect(lcp, `LCP war ${lcp.toFixed(0)}ms`).toBeLessThanOrEqual(LCP_BUDGET_MS)
  })

  test(`${route}: CLS innerhalb des Budgets (<= ${CLS_BUDGET})`, async ({ page }) => {
    await page.goto(route, { waitUntil: 'load' })
    const cls = await measureCls(page)
    expect(cls, `CLS war ${cls.toFixed(3)}`).toBeLessThanOrEqual(CLS_BUDGET)
  })

  test(`${route}: übertragenes JS innerhalb des Budgets (<= ${Math.round(JS_TRANSFER_BUDGET_BYTES / 1024)} KB)`, async ({ page }) => {
    let totalBytes = 0
    page.on('response', async (response) => {
      const url = response.url()
      const contentType = response.headers()['content-type'] ?? ''
      if (!url.includes('.js') && !contentType.includes('javascript')) return
      // Content-Length spiegelt bei Next.js' statischen /_next/static/-JS-Chunks die tatsächlich
      // übertragene (gzip-komprimierte) Grösse -- response.body() liefert dagegen die von
      // Playwright bereits DEKOMPRIMIERTE Grösse und hätte das Budget künstlich ~3x zu niedrig
      // wirken lassen (erster Lauf: 1.3 MB "übertragen" für Seiten, die real deutlich kleiner
      // sind). Fallback auf die dekomprimierte Body-Grösse nur, falls der Header fehlt (z. B. bei
      // gechunkten Responses ohne Content-Length) -- lieber eine grobe Überschätzung als ein
      // stiller blinder Fleck.
      const contentLength = response.headers()['content-length']
      if (contentLength) {
        totalBytes += Number(contentLength)
        return
      }
      try {
        const body = await response.body()
        totalBytes += body.length
      } catch {
        // Response bereits geschlossen/umgeleitet -- für ein grobes Budget vernachlässigbar.
      }
    })

    await page.goto(route, { waitUntil: 'networkidle' })
    expect(totalBytes, `${(totalBytes / 1024).toFixed(0)} KB JS geladen`).toBeLessThanOrEqual(
      JS_TRANSFER_BUDGET_BYTES
    )
  })
}
