# Env-Separation- und Secret-Audit (Abschnitt 10.4)

Stand: 22.07.2026. Deckt den Abschnitt-10.4-Punkt "Umgebungswerte" ab: "Produktion, Staging, Test
und Local besitzen getrennte Supabase-/Auth-/Mail-Werte. Service-Role-Keys bleiben serverseitig,
werden nie an Client-Bundles oder Logs gegeben und nach vermutetem Leak rotiert. CI prüft auf
Remote-URLs im Local-only-Gate und auf eingecheckte Secrets." Wie `runbook-marketing-cutover.md`
ist dies ein Teilpunkt von 10.4, nicht das gesamte Produktions-Gate.

Kein Secret-Wert (Schlüssel, Token, Passwort) wurde für diesen Audit gelesen oder ausgegeben --
alle Prüfungen unten sind strukturell (Dateiname, Pfadmuster, Regex auf bekannte Schlüsselformate),
nie inhaltlich.

## Befund: bereits vorhanden und korrekt

- `.env*` ist in `.gitignore` ausgeschlossen, nur `*.example`-Vorlagen sind erlaubt und eingecheckt
  (`.env.example`, `.env.test.local.example`). `git log --all` über `.env`/`.env.local`/
  `.env.test.local` zeigt keinen einzigen Commit -- diese Dateien waren nie im Repo.
- Keine JWT-förmigen Schlüssel, Anthropic- oder AWS-Key-Muster in der gesamten Git-Historie
  gefunden (`git grep` über alle Commits).
- `SUPABASE_SERVICE_ROLE_KEY` wird ausschliesslich in eindeutig serverseitigem Code gelesen:
  drei `'use server'`-Dateien (`app/(auth)/register/actions.ts`,
  `app/(dashboard)/dashboard/admin/benutzer/actions.ts`) sowie `lib/supabase/server.ts` (nutzt
  `next/headers`, kann strukturell nicht ins Client-Bundle gelangen). Keine `"use client"`-Datei
  referenziert diese Variable oder eine der anderen Server-Secrets (`ANTHROPIC_API_KEY`,
  `AUTH_SECRET`).
- `next.config.ts` hat keinen `env:`-Block, der Server-Secrets ins Client-Bundle inlinen würde.
- Lokale Test-/Gate-Skripte (`with-local-supabase.mjs`, `seed-e2e-users.mjs`,
  `seed-e2e-course-fixtures.mjs`, `test-data-migration.mjs`) laufen bereits ausschliesslich über
  `scripts/lib/local-supabase.mjs`: gepinnte, hash-verifizierte Supabase-CLI
  (`assertApprovedCli()`) plus harter Loopback-Zwang (`assertLoopback()`), der bei jeder
  nicht-`127.0.0.1`/`localhost`-URL sofort abbricht.
- `scripts/decommission-learning-materials-bucket.ts` ist bewusst live-only (Einmal-Skript,
  bereits ausgeführt), sichert sich aber per Projekt-Ref-Allowlist gegen ein versehentliches
  Laufen gegen das falsche Projekt ab.

## Befund: zwei unguardete Live-Write-Skripte gefunden und gehärtet

`scripts/import-exams.ts` und `scripts/import-all-exams.ts` (beide unverändert seit dem allerersten
Commit, `b0b4242`, 02.03.2026 -- vor Beginn dieser Migration) lasen `NEXT_PUBLIC_SUPABASE_URL` und
`SUPABASE_SERVICE_ROLE_KEY` ungeprüft aus `process.env` bzw. direkt aus `.env.local`. `.env.local`
zeigt laut CLAUDE.md ("Datenbank-Workflow") bewusst auf das **Live**-Projekt. Ein versehentlicher
Lauf (z. B. `npx tsx scripts/import-exams.ts` in einer Shell mit geladenem `.env.local`) hätte mit
service_role-Rechten (RLS-Bypass) direkt in Produktion geschrieben -- ohne jede Bestätigung oder
Ausgabe, gegen welches Projekt gerade geschrieben wird.

**Behoben:** beide Skripte lehnen jetzt jede nicht-lokale `NEXT_PUBLIC_SUPABASE_URL` sofort ab,
im selben Muster wie das bereits vorhandene `scripts/concurrency-test-booking.ts`. Zusätzlich in
`import-exams.ts` einen toten Fallback-Pfad entfernt, der den absoluten Home-Verzeichnispfad einer
anderen Person (`/Users/robinmuhlemann/...`) hartcodiert hatte -- kein Secret, aber unnötige,
funktionslose personenbezogene Pfadangabe aus der Frühphase des Projekts.

**Offene Empfehlung, nicht selbst entschieden:** Beide Skripte importieren aus
`../ZAP/bahrdi-projekt/app/data/json` -- einem gemäss `.gitignore`-Kommentar ausdrücklich
projektfremden, nur lokal beim ursprünglichen Entwickler vorhandenen Referenzordner. Sie sind seit
über vier Monaten unverändert und in keinem aktuellen Migrationsschritt referenziert; vermutlich
reine historische Einmal-Importe. Ob sie gelöscht oder als Referenz behalten werden, ist eine
Aufräum-Entscheidung, keine Sicherheitsentscheidung -- absichtlich nicht ungefragt gelöscht.

## Neu: lokaler Secret-Scan

`scripts/check-no-leaked-secrets.mjs` (`npm run check:secrets`) prüft alle **git-getrackten**
Dateien (keine neue Abhängigkeit, kein gitleaks/trufflehog-Download):

1. Keine `.env*`-Datei ausser `*.example` ist eingecheckt (Verteidigung in der Tiefe gegen ein
   `git add -f`, das `.gitignore` umgehen würde).
2. Kein bekanntes Secret-Format (Supabase/JWT-förmiger Schlüssel, Anthropic-API-Key,
   AWS-Access-Key-ID) taucht im Dateiinhalt auf.

Aktueller Stand: **grün**, 501 getrackte Dateien, keine Funde.

## Bewusst NICHT Teil dieses Audits (verbleibende Lücke)

Es existiert **keine CI-Pipeline** (`.github/workflows` fehlt vollständig). Abschnitt 10.4 verlangt
wörtlich "CI prüft auf Remote-URLs im Local-only-Gate und auf eingecheckte Secrets" -- das oben
beschriebene Skript ist dafür die manuell ausführbare Grundlage, ersetzt eine echte
CI-Durchsetzung (bei jedem Push/PR automatisch, nicht nur bei manuellem Aufruf) aber nicht. Eine
CI-Einrichtung berührt Entscheidungen, die nicht implizit mitentschieden werden sollten (Runner/
Provider, ob und wie ein Docker-basierter lokaler Supabase-Stack in CI überhaupt praktikabel läuft,
Kosten) und ist deshalb bewusst als offener, separat zu vergebender Folgeschritt dokumentiert statt
selbst eingerichtet.

Ebenfalls nicht Teil dieses Audits: Mail-Werte (kein Mail-Provider ist im Projekt aktuell verdrahtet,
siehe fehlender E-Mail-Outbox-Punkt in Abschnitt 10.4), Schlüsselrotation nach einem vermuteten Leak
(kein Leak wurde hier gefunden, es gibt daher nichts zu rotieren) und Staging-spezifische
Env-Werte (kein Staging-Environment existiert bisher).
