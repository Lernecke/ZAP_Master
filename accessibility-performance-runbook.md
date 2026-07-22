# Accessibility- und Performance-Abnahme (Abschnitt 10.4)

Stand: 22.07.2026. Deckt den letzten offenen Teilpunkt des Produktions-Gates ab: "Accessibility-
Prüfung nach WCAG 2.2 AA für Navigation, Dialoge, Formfehler, Tastatur/Fokus, Kontrast, Reduced
Motion und Screenreader; Performance-Budgets für LCP, CLS und JS; Browser-/Mobile-Testmatrix. Die
visuelle Prüfung allein ersetzt diese Tests nicht." Wie die übrigen 10.4-Dokumente
(`runbook-marketing-cutover.md`, `env-separation-audit.md`, `observability-runbook.md`) ein eng
begrenzter Teilpunkt, nicht das gesamte Gate.

## Was jetzt existiert

### `tests/accessibility.spec.ts` (`npm run test:a11y`)

Nutzt `@axe-core/playwright` (neue, reine Dev-Dependency, kein Account/Vendor -- MIT-lizenziert,
lokal ausgeführt) mit den Tag-Filtern `wcag2a, wcag2aa, wcag21aa, wcag22aa`:

- Automatisierter Scan aller wichtigsten öffentlichen Seiten (Startseite, Kontakt, Nachhilfe,
  Über uns, Zielgruppen-Hauptseite, zwei Kursdetailseiten).
- Geöffneter Anmelde-Dialog: eigener Scan auf `[role="dialog"]`, plus expliziter Test, dass
  `Escape` schliesst und der Fokus zum auslösenden Element zurückkehrt (Radix-Dialog-Standard).
- Formfehler: leeres Abschicken des Anmeldeformulars (rein client-seitige Zod-Validierung, kein
  DB-Zugriff) und Scan der resultierenden Fehlerdarstellung.
- Tastatur/Fokus: `SiteNav`-Login-Link ist per Tab erreichbar und sichtbar fokussiert.

**Kontrast** ist über axe-cores `color-contrast`-Regel automatisch Teil jedes obigen Scans (läuft
mit den WCAG-AA-Tags standardmässig mit) -- kein separater Test nötig.

### `tests/performance.spec.ts` (`npm run test:performance`)

Native Browser-Performance-APIs statt einer weiteren Abhängigkeit (kein `web-vitals`-Paket):
`PerformanceObserver` für `largest-contentful-paint` und `layout-shift`, ein
Response-Listener für die Summe aller geladenen JS-Bytes. Budgets:

| Metrik | Budget | Quelle |
|---|---|---|
| LCP | ≤ 2.5 s | Google Core Web Vitals, Schwelle "good" |
| CLS | ≤ 0.1 | Google Core Web Vitals, Schwelle "good" |
| JS (unkomprimiert) | ≤ 1800 KB / Seite | Regressions-Wächter, kalibriert auf den beobachteten Ist-Stand (~1.29-1.42 MB) |

**JS-Budget-Hinweis:** Der Test bevorzugt den `Content-Length`-Header (reale Transfergrösse, falls
komprimiert ausgeliefert) und fällt sonst auf die von Playwright bereits dekomprimierte
Body-Grösse zurück. Auf dieser lokalen Windows-Entwicklungsmaschine liefert `next start` für
`/_next/static/`-JS-Chunks in beiden Fällen denselben (unkomprimierten) Wert. Das Budget ist deshalb
bewusst ein grober Regressions-Wächter auf unkomprimierten Bytes (z. B. gegen eine versehentlich
client-seitig importierte schwere Bibliothek), keine reale Transfer-Zusage -- eine echte,
komprimierte Produktionsmessung bräuchte eine echte CDN-/Edge-Auslieferung.

**Browser-/Mobile-Testmatrix:** `playwright.config.ts` hat jetzt zwei Projekte. `chromium`
(Desktop) läuft für alle Test-Dateien wie bisher. `mobile-chrome` (Pixel-5-Emulation) ist über
`testMatch` bewusst nur auf `performance.spec.ts` beschränkt -- die übrigen Suiten
(`routes`/`links`/`accessibility`/`flag-rollback`) laufen dadurch unverändert nur unter Desktop
Chrome, ohne dass sich die Laufzeit des Haupt-Gates verdoppelt. `npm run test:performance` deckt
dadurch automatisch Desktop **und** Mobile ab.

## Was bewusst NICHT abgedeckt ist (offene Lücken, nicht stillschweigend übersprungen)

- **Vollständiger manueller Screenreader-Durchgang (NVDA/VoiceOver):** axe-core prüft ARIA-/
  Landmark-/Label-Korrektheit automatisiert und deckt damit einen realen, aber unvollständigen
  Teil von "Screenreader" ab. Ein tatsächlicher Durchgang mit einem echten Screenreader --
  insbesondere für Lesereihenfolge, Ankündigungen bei dynamischen Änderungen (z. B. Live-Region
  bei "Anmeldung erfolgreich!") -- erfordert einen menschlichen Tester und ein echtes
  Screenreader-Setup; in dieser Umgebung nicht ausführbar.
- **Browser-Matrix jenseits von Chrome:** Firefox und WebKit sind lokal nicht installiert
  (`npm exec -- playwright install firefox webkit` würde sie ergänzen). Aktuell nur Chrome
  Desktop + Chrome Mobile (Pixel 5). Naheliegender, aber bewusst nicht in diesem Schritt
  durchgeführter Folgeschritt.
- **Performance-Budgets sind lokale Indikatoren, keine Produktionsmessung:** Läuft gegen
  `next start` auf einer Windows-Entwicklungsmaschine mit lokalem Docker-Supabase im Hintergrund,
  nicht gegen eine echte CDN-/Edge-Auslieferung. Werte können unter Systemlast schwanken; bei
  einem Fehlschlag zuerst lokal erneut laufen lassen, bevor er als echte Regression gilt.
- **Kein Lighthouse-CI/RUM (Real User Monitoring):** Für belastbare Produktionswerte (echte
  Nutzer, echte Netzwerke/Geräte) wäre ein Tool wie Lighthouse CI oder ein RUM-Dienst nötig --
  beides eine Vendor-/Konto-Entscheidung, absichtlich nicht unilateral getroffen.

## Gefundene und behobene Accessibility-Funde

### Buchungsdialog (`app/(public)/kurse/anmeldung-modal.tsx`) -- grösster Fund

Das eigentliche Buchungsmodal -- das zentrale Interaktionselement der gesamten öffentlichen Seite,
wiederverwendet von `/kurse` UND allen neuen Marketing-Kursdetailseiten
(`app/components/kurse/existing-course-booking.tsx`,
`app/components/kurse/booking-section-with-modal.tsx`) -- war ein handgebautes `<div>` ohne
`role="dialog"`, ohne `aria-modal`, ohne Fokus-Trap und ohne Fokus-Rückgabe an das auslösende
Element. Der Schliessen-Button (nur ein "X"-Icon) hatte keinen zugänglichen Namen. Für
Screenreader-Nutzende war das Modal beim Öffnen faktisch unsichtbar als Dialog; per Tab liess sich
der Fokus aus dem Modal heraus auf Elemente dahinter verschieben.

Zusätzlich hatten alle sieben Formularfelder (`<label>` ohne `htmlFor`/`id`-Zuordnung zum Feld)
keine programmatische Label-Verknüpfung (WCAG 1.3.1/4.1.2) -- ein Screenreader hätte beim
Fokussieren eines Feldes keinen Feldnamen angesagt. Die "Geschlecht"-Gruppe nutzte ausserdem ein
einzelnes `<label>` für drei Radios, was semantisch nur EIN Control beschreiben darf.

**Behoben:** Migration auf das bereits im Projekt vorhandene Radix-`Dialog`
(`app/components/ui/dialog.tsx`, an anderer Stelle im Projekt bereits verwendet) bei identischer
Optik/Struktur -- liefert `role="dialog"`, `aria-modal`, Fokus-Trap, Escape-Handling und
Body-Scroll-Lock korrekt und getestet; die vorherigen manuellen `useEffect`-Implementierungen für
Escape/Scroll-Lock konnten entfallen. Da der Trigger-Button ausserhalb der Modal-Komponente liegt
(kein `<DialogTrigger>`), kennt Radix ihn nicht automatisch für die Fokus-Rückgabe -- explizit via
`onCloseAutoFocus` nachgerüstet (das zuvor fokussierte Element wird beim Mounten erfasst und beim
Schliessen wieder fokussiert). Alle Formularfelder erhielten `id`/`htmlFor`, `aria-invalid` und
`aria-describedby` auf die zugehörige Fehlermeldung; die Geschlecht-Gruppe wurde zu
`<fieldset>`/`<legend>` umgebaut.

**Nicht behoben, dokumentierter Folgefund:** `app/(dashboard)/intensivkurse/anmeldung-modal-dashboard.tsx`
ist ein strukturell fast identisches, aber separates Duplikat für den geschützten
Dashboard-Buchungsflow und vermutlich von denselben Problemen betroffen. Ausserhalb des Scopes
dieses Schritts (kein automatisierter Accessibility-Test deckt es aktuell ab); zeitnaher, klar
umrissener Folgeschritt.

### `app/not-found.tsx` -- Reduced Motion

Endlos wiederholende Bounce-Animation (`repeat: Infinity`) ohne jede Rücksicht auf
`prefers-reduced-motion` -- genau die Art automatisch startender, dauerhafter, nicht pausierbarer
Bewegung, die WCAG 2.2 SC 2.2.2 (Pause, Stop, Hide) und SC 2.3.3 (Animation from Interactions)
adressieren. Behoben durch `<MotionConfig reducedMotion="user">` um den gesamten animierten Baum:
framer-motion deaktiviert damit für alle `motion.*`-Nachfahren automatisch sowohl die Eintritts-
als auch die Endlos-Animation, sobald das Betriebssystem "Bewegung reduzieren" meldet.

### Startseite -- Kontrast

Die Eyebrow-Beschriftung im Hero (`app/[locale]/(marketing)/page.tsx`) nutzte
`text-secondary-foreground` (weiss) direkt auf dem Seitenhintergrund statt gepaart mit
`bg-secondary` -- Kontrast 1.08:1 statt der geforderten 4.5:1 (axe-core `color-contrast`, WCAG 2
AA), der Text war de facto unsichtbar. Behoben durch `Badge variant="secondary"` (liefert das
korrekte Hintergrund-/Vordergrund-Paar), demselben Muster wie an anderer Stelle bereits verwendet
(`app/components/layout/page-intro.tsx`).

## Ausführung

```powershell
npm run test:data-migration   # setzt lokale DB zurück und seedet u.a. "Kurs B" mit 1 freiem Platz
npm run build:test
npm exec -- playwright install chromium   # falls noch nicht geschehen
npm run test:a11y             # VOR test:routes ausführen, siehe unten
npm run test:performance
npm run test:routes
npm run test:links
```

**Reihenfolge ist hier bewusst wichtig, nicht beliebig:** `test:a11y` und `test:routes` teilen sich
dieselbe seedete Session "Kurs B" (E2E-Fixture, `kursId=9001`). `test:a11y` öffnet den
Buchungsdialog nur (nie ein tatsächlicher Abschluss), aber `test:routes`' Cache-Regressionstest
schliesst absichtlich eine echte Buchung ab und verbraucht damit den einzigen freien Platz. Läuft
`test:a11y` danach auf derselben, nicht neu geseedeten DB, ist "Kurs B" bereits ausgebucht und die
drei Dialog-Tests schlagen fehl -- kein Bug in der Anwendung, sondern reine Testreihenfolge. Vor
`test:a11y` deshalb immer frisch resetten/seeden (oder es einfach vor `test:routes` laufen lassen,
wie oben). `test:performance` hat keine solche Abhängigkeit.

Beide neuen Läufe ergänzen die zwölf Befehle aus Abschnitt 10.2 und die weiteren 10.4-Läufe
(`test:flag-rollback`, `check:secrets`) und ersetzen sie nicht.
