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

**Browser-/Mobile-Testmatrix:** `playwright.config.ts` hat jetzt vier Projekte. `chromium`
(Desktop) läuft für alle Test-Dateien wie bisher. `mobile-chrome` (Pixel-5-Emulation) ist über
`testMatch` bewusst nur auf `performance.spec.ts` beschränkt -- die übrigen Suiten
(`routes`/`links`/`accessibility`/`flag-rollback`) laufen dadurch unverändert nur unter Desktop
Chrome, ohne dass sich die Laufzeit des Haupt-Gates verdoppelt. `npm run test:performance` deckt
dadurch automatisch Desktop **und** Mobile ab. `firefox` und `webkit` (jeweils Desktop) sind analog
per `testMatch` bewusst nur auf `tests/accessibility.spec.ts` beschränkt statt auf alle Suiten:
axe-core-Ergebnisse und insbesondere Fokus-/Dialog-/Escape-Verhalten (Radix Dialog) unterscheiden
sich real zwischen Browser-Engines, während Route-/Link-/Cache-Verhalten Next.js-/Server-seitig ist
und keine dritte/vierte Wiederholung braucht. `npm run test:a11y` (kein Projekt-Filter mehr) deckt
dadurch automatisch Chromium + Firefox + WebKit ab -- die zuvor hier als offene Lücke geführte
Browser-Matrix jenseits von Chrome ist damit geschlossen (siehe Fund weiter unten, den genau diese
Erweiterung aufgedeckt hat).

## Was bewusst NICHT abgedeckt ist (offene Lücken, nicht stillschweigend übersprungen)

- **Vollständiger manueller Screenreader-Durchgang (NVDA/VoiceOver):** axe-core prüft ARIA-/
  Landmark-/Label-Korrektheit automatisiert und deckt damit einen realen, aber unvollständigen
  Teil von "Screenreader" ab. Ein tatsächlicher Durchgang mit einem echten Screenreader --
  insbesondere für Lesereihenfolge, Ankündigungen bei dynamischen Änderungen (z. B. Live-Region
  bei "Anmeldung erfolgreich!") -- erfordert einen menschlichen Tester und ein echtes
  Screenreader-Setup; in dieser Umgebung nicht ausführbar.
- **Firefox/WebKit nur für die Accessibility-Suite, nicht für routes/links/flag-rollback:** eine
  bewusste Abwägung (siehe oben), keine vollständige 4-fache Browser-Matrix über das gesamte Gate.
  Cache-/Routing-/Redirect-Verhalten ist serverseitig (Next.js) und branchenüblich
  engine-unabhängig; ein realer Zugewinn wurde hier nicht erwartet und stünde in keinem Verhältnis
  zur vervierfachten Gate-Laufzeit.
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

**Nachtrag -- ebenfalls behoben:** `app/(dashboard)/intensivkurse/anmeldung-modal-dashboard.tsx`,
das strukturell fast identische, separate Duplikat für den geschützten Dashboard-Buchungsflow, war
tatsächlich von denselben Problemen betroffen. Mit demselben Radix-Dialog-Fix nachgezogen
(inklusive `onCloseAutoFocus`, `fieldset`/`legend`, Label-Assoziationen) und mit einem eigenen,
authentifizierten Testfall in `tests/accessibility.spec.ts` abgedeckt.

#### Nebenfund beim Testen des Dashboard-Modals: RLS-Regression auf `/intensivkurse`

Der neue authentifizierte Testfall deckte einen zweiten, von der Dialog-Frage unabhängigen
Fehler auf: `/intensivkurse` zeigte für jeden eingeloggten Nutzer ohne Lehrperson-/Admin-Rechte
**"0 Kurse gefunden"**, obwohl aktive Kurse existierten. Ursache: `intensivwoche_kurse` hatte nur
eine SELECT-Policy `anon_select_active_kurse` (`TO anon`) für aktive Kurse und eine
Owner-beschränkte `lehrperson_select_own_kurse` (`TO authenticated`) -- keine Policy erlaubte einem
gewöhnlichen eingeloggten Nutzer das Lesen aktiver Kurse. Ein eingeloggter Nutzer war dadurch
schlechter gestellt als ein anonymer Gast auf der öffentlichen `/kurse`-Seite.

Behoben additiv in `supabase/migrations/20260722084521_grant_authenticated_select_active_kurse.sql`
(neue Policy `authenticated_select_active_kurse`, spiegelt die anon-Policy für `TO authenticated`;
keine Rechteausweitung, da dieselben Zeilen bereits über `anon` lesbar sind). Regressionsgeschützt
durch `supabase/tests/database/0019_authenticated_select_active_kurse.sql` (pgTAP) sowie den oben
genannten Playwright-Test, der jetzt den echten Dialog auf der echten, mit Daten befüllten Seite
öffnet statt an einer leeren Kursliste zu scheitern.

### `app/not-found.tsx` -- Reduced Motion

Endlos wiederholende Bounce-Animation (`repeat: Infinity`) ohne jede Rücksicht auf
`prefers-reduced-motion` -- genau die Art automatisch startender, dauerhafter, nicht pausierbarer
Bewegung, die WCAG 2.2 SC 2.2.2 (Pause, Stop, Hide) und SC 2.3.3 (Animation from Interactions)
adressieren. Behoben durch `<MotionConfig reducedMotion="user">` um den gesamten animierten Baum:
framer-motion deaktiviert damit für alle `motion.*`-Nachfahren automatisch sowohl die Eintritts-
als auch die Endlos-Animation, sobald das Betriebssystem "Bewegung reduzieren" meldet.

### Buchungs-CTA (`app/components/kurse/booking-button.tsx`) -- Fokus-Rückgabe versagte in WebKit/Safari

Gefunden, nachdem die neu ergänzten `firefox`/`webkit`-Projekte (siehe oben) zum ersten Mal gegen
`tests/accessibility.spec.ts` liefen: Der Escape-Test (Dialog schliesst, Fokus kehrt zum
auslösenden "Anmelden"-Button zurück) bestand unter Chromium und Firefox, schlug unter WebKit aber
reproduzierbar fehl -- `document.activeElement` landete nach dem Schliessen auf `<body>` statt auf
dem Button.

**Root Cause:** `anmeldung-modal.tsx` erfasst den Trigger für die spätere Fokus-Rückgabe über
`document.activeElement` im Moment, in dem das Modal mountet (siehe Fund oben, "Buchungsdialog").
Das setzt voraus, dass der geklickte Button zu diesem Zeitpunkt bereits fokussiert ist. Chromium und
Firefox fokussieren Buttons automatisch bei einem Maus-Klick -- WebKit/Safari tut das nicht
(bekannter, langjähriger Engine-Unterschied). `document.activeElement` war beim Öffnen des Modals in
WebKit deshalb bereits `<body>`, die anschliessende Fokus-Rückgabe (`triggerElement.focus()`) rief
folgerichtig `body.focus()` auf -- ein Aufruf ohne Effekt, kein Fehler, aber auch keine
Fokus-Rückgabe. Kein Bug in Radix oder in der `onCloseAutoFocus`-Logik selbst, sondern eine falsche
Annahme über nativ browserübergreifend identisches Klick-Fokus-Verhalten.

**Behoben:** `BookingButton` ruft beim Klick jetzt explizit `event.currentTarget.focus()` auf,
bevor es `onBook()` aufruft -- macht das Verhalten browserunabhängig, statt sich auf natives
Klick-Fokussierungsverhalten zu verlassen, das es in Safari für Buttons so nicht gibt. Das behebt
den Fehler nicht nur im Test: reale Safari-/iOS-Nutzende hätten nach dem Schliessen des Dialogs per
Escape denselben Fokusverlust erlebt (Fokus fällt zurück auf `<body>`, Tastaturnutzung muss danach
wieder manuell zur Buchungstabelle navigieren) -- ein echter Accessibility-Fund, kein reines
Test-Artefakt. Kein weiterer Workaround (z. B. verzögerte `requestAnimationFrame`-Fokussierung in
`anmeldung-modal.tsx`) war nötig, nachdem die eigentliche Ursache behoben war -- gegengeprüft, indem
ein zuerst versuchsweise ergänzter `requestAnimationFrame`-Umweg wieder entfernt wurde und die Suite
weiterhin unter allen drei Browsern grün blieb.

### Startseite -- Kontrast

Die Eyebrow-Beschriftung im Hero (`app/[locale]/(marketing)/page.tsx`) nutzte
`text-secondary-foreground` (weiss) direkt auf dem Seitenhintergrund statt gepaart mit
`bg-secondary` -- Kontrast 1.08:1 statt der geforderten 4.5:1 (axe-core `color-contrast`, WCAG 2
AA), der Text war de facto unsichtbar. Behoben durch `Badge variant="secondary"` (liefert das
korrekte Hintergrund-/Vordergrund-Paar), demselben Muster wie an anderer Stelle bereits verwendet
(`app/components/layout/page-intro.tsx`).

### Dashboard-Buchungsdialog (`app/(dashboard)/intensivkurse/anmeldung-modal-dashboard.tsx`) -- Kontrast, fälschlich mehrfach als "Flake" abgetan

Über mehrere vorangegangene Commits hinweg tauchte derselbe Test
(`Buchungsdialog im geschützten Dashboard ... hat keine WCAG-AA-Verstösse`) wiederholt und
scheinbar zufällig auf wechselnden Browsern fehlschlagend auf (Chromium, dann WebKit, dann
Firefox, dann WebKit **und** Firefox gleichzeitig) und wurde jedes Mal als reproduzierbar
bestehender, umgebungsbedingter Flake dokumentiert, weil er in Isolation stets sofort wieder grün
war. Das war eine Fehldiagnose: axe-core meldete durchgehend `color-contrast` für den
Profil-Vorausgefüllt-Hinweis im Dialog -- `text-green-700 dark:text-green-300` auf
`bg-green-50 dark:bg-green-950/30` (freie Tailwind-Farben statt der semantischen Projekt-Token aus
Abschnitt 1) lag mit 4.31:1 hauchdünn unter der geforderten 4.5:1-Schwelle. Genau ein derart
knapper Grenzfall wird von unterschiedlichen Browser-Rendering-Engines (Subpixel-/
Antialiasing-Unterschiede) mal knapp über, mal knapp unter die Schwelle gerundet -- daher die
Illusion eines browser-/lastabhängigen Flakes über mehrere Commits hinweg, obwohl die Ursache die
ganze Zeit ein echter, deterministischer Kontrastfehler war.

**Behoben** durch Umstellung auf die bereits etablierten semantischen Token statt eines neuen
Grünwerts: `bg-secondary/10 border-secondary/25` für die Fläche, `text-secondary` fürs Icon,
`text-foreground` für den eigentlichen Fliesstext -- exakt das Muster, das die Erfolgsansicht in
`app/(public)/kurse/anmeldung-modal.tsx` für denselben Zweck bereits verwendet (Text bleibt
`text-foreground`/`text-muted-foreground`, nur das Icon trägt die Akzentfarbe). Dadurch entfällt
das Problem strukturell, statt nur einen neuen, ebenfalls manuell zu kalibrierenden Grünton zu
suchen. Nach der Korrektur lief die Suite mehrfach vollständig grün auf allen drei Browsern.

**Lehre für künftige Funde:** Ein Test, der nur auf einzelnen Browsern und nur manchmal fehlschlägt,
ist nicht automatisch ein Timing-/Lastproblem -- bei axe-core-`color-contrast`-Verstössen nahe der
Schwelle zuerst den tatsächlichen Kontrastwert im Fehlerreport prüfen, bevor die Ursache auf die
Testumgebung geschoben wird.

## Ausführung

```powershell
npm run test:data-migration   # setzt lokale DB zurück und seedet u.a. "Kurs B" mit 1 freiem Platz
npm run build:test
npm exec -- playwright install chromium firefox webkit   # falls noch nicht geschehen
npm run test:a11y             # VOR test:routes ausführen, siehe unten -- jetzt Chromium+Firefox+WebKit
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
