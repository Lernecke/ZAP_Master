# Runbook: Marketing-Release-Flag (Feature-Flag/Cutover, Abschnitt 10.4)

Stand: 22.07.2026. Deckt genau einen Teilpunkt des Produktions-Gates in Abschnitt 10.4 des
Architektur-Briefings ab ("Feature-Flag/Cutover"). Die übrigen 10.4-Punkte (Staging/Backup,
Env-Trennung/Secrets, Observability, E-Mail-Outbox, Accessibility-/Performance-Abnahme) sind davon
unabhängig und **nicht** Gegenstand dieses Dokuments.

## Was der Schalter tut

`MARKETING_SITE_LIVE` (Server-only Env-Var, siehe `lib/marketing-flag.ts`) steuert, ob die neuen
lokalisierten Marketingrouten (`/`, `/de/...`, alles unter `app/[locale]/(marketing)/`) live
ausgeliefert werden.

- **Fehlt die Variable oder ist sie auf irgendetwas ausser dem exakten String `"false"` gesetzt:**
  Live-Zustand, unverändertes aktuelles Verhalten.
- **`MARKETING_SITE_LIVE=false`:** `proxy.ts` leitet jede dieser Routen (inklusive `/`) per
  Redirect auf die weiterhin unverändert funktionierende Bestandsroute `/kurse` um. `app/sitemap.ts`
  listet in diesem Zustand ebenfalls nur noch `/kurse`, damit Suchmaschinen nicht auf tote
  Marketingziele verwiesen werden. `/login`, `/register`, alle geschützten Dashboard-Routen und
  `/kurse` selbst sind vom Schalter unberührt.

**Wichtiger Unterschied zwischen den beiden Effekten:** Der Redirect in `proxy.ts` läuft in der
Middleware und liest `process.env.MARKETING_SITE_LIVE` beim Start des Serverprozesses (nicht erst
beim Build) ein -- er wirkt also sofort nach einem Neustart des Serverprozesses mit gesetzter
Variable, **ohne** neuen Build.
`app/sitemap.ts` hat dagegen keine dynamische API (kein `cookies()`/`headers()`/`searchParams`) und
wird deshalb -- wie `app/robots.ts` mit `NEXT_PUBLIC_ALLOW_INDEXING` -- einmal beim Build statisch
gerendert und danach unverändert ausgeliefert. Die Sitemap-Gating-Logik greift also erst nach einem
**Rebuild** mit dem neuen Wert. Für den eigentlichen Rollback-Schutz (kein Zugriff mehr auf die
neuen Seiten) ist das unerheblich, da der Redirect bereits ohne Rebuild greift; die Sitemap-Liste
ist nur ein nachgelagertes SEO-Hygiene-Detail.

## Bewusste Abweichung von der wörtlichen Vorgabe

Abschnitt 10.4 verlangt wörtlich einen Rollback "zunächst auf die bisherige Start-/Kursroute". Die
alte Startseite (`app/page.tsx` mit der alten Navbar aus `app/components/zap/navbar.tsx`) wurde in
Schritt 7 des Ausführungsplans absichtlich vollständig ersetzt und existiert im aktuellen Code
nicht mehr parallel (siehe CLAUDE.md: "Die Startseite ... ERSETZT die bestehende Startseite
vollständig, sie wird nicht ergänzt"). Ein Rollback auf exakt diesen alten Code wäre nur über einen
Revert der entsprechenden Commits möglich, nicht über einen Laufzeit-Schalter. Die "bisherige
Kursroute" (`/kurse`) existiert dagegen unverändert weiter -- der Schalter bildet deshalb
konsequent nur noch diese eine, heute noch erreichbare Hälfte der Vorgabe ab: ein einheitlicher
Fallback auf `/kurse` statt eines 404/500 auf den neuen Routen.

## Was der Schalter NICHT tut

- Er löscht, sperrt oder verändert keine Daten. `offers`, `offer_editions`, `course_sessions` und
  alle übrigen seit Schritt 5 additiv angelegten Tabellen bleiben unverändert bestehen und sind
  sofort wieder sichtbar, sobald das Flag erneut aktiviert wird.
- Er betrifft nicht `/kurse`, Auth oder das Dashboard -- diese Bereiche liefen vor und laufen nach
  dem Rollback identisch weiter.
- Er ist kein Ersatz für eine destruktive Cleanup-Migration; eine solche bleibt laut Abschnitt 10.4
  ein separat freizugebender, späterer Schritt nach einer Beobachtungsfrist.

## Rollback-Ablauf (bei Vorfall auf der neuen Marketingseite)

1. `MARKETING_SITE_LIVE=false` in der betroffenen Umgebung setzen (Hosting-Dashboard bzw. Secrets-
   Verwaltung der jeweiligen Umgebung -- **nicht** in `.env`/`.env.local` einchecken).
2. Deployment mit dieser Variable neu starten/redeployen. Kein neuer Code-Deploy nötig, wenn der
   aktuelle Stand bereits den Schalter enthält (dieser Commit).
3. Verifizieren: `/` und eine bekannte Marketingroute (z. B. `/de/ueber-uns`) liefern einen
   Redirect auf `/kurse`; `/kurse` selbst liefert weiterhin 200; `/login` bleibt unverändert
   erreichbar.
4. Ursache des Vorfalls beheben, lokal mit `npm run test:flag-rollback` (siehe unten) sowie dem
   regulären Gate (Abschnitt 10.2) verifizieren.
5. `MARKETING_SITE_LIVE` wieder entfernen bzw. auf einen anderen Wert als `"false"` setzen, erneut
   deployen.

Keiner dieser Schritte erfordert eine Datenbankmigration, ein Zurückrollen von Migrationen oder ein
Löschen von Zeilen.

## Lokale Verifikation

Eigener, vom regulären Gate getrennter Playwright-Lauf (`tests/marketing-flag-rollback.spec.ts`,
`playwright.flag-off.config.ts`), weil er einen eigenen Serverstart mit gesetztem
`MARKETING_SITE_LIVE=false` braucht:

```powershell
npm run build:test
npm exec -- playwright install chromium   # falls noch nicht geschehen
npm run test:flag-rollback
```

Prüft: `/` und eine Marketing-Detailroute redirecten auf `/kurse`, `/kurse` selbst bleibt 200 ohne
Redirect-Schleife, `/login` bleibt erreichbar. `sitemap.xml` wird hier bewusst nicht geprüft, siehe
Abschnitt "Was der Schalter tut" oben (Build-Zeit- vs. Request-Zeit-Effekt) -- ein `next start` auf
einem mit `MARKETING_SITE_LIVE=true` gebauten Output zeigt dort weiterhin die volle Liste, das ist
kein Fehler. Dieser Lauf ergänzt die zwölf Befehle aus Abschnitt 10.2, ersetzt sie nicht.
