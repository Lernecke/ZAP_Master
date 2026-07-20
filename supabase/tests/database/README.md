# pgTAP-Tests fuer das lokale Baseline-Gate

Dieses Verzeichnis ist gemaess `step0Baseline.revision2.md`, Abschnitt 10, eine Voraussetzung
fuer das lokale Gate (`supabase test db`). Die Dateien wurden am 19.07.2026 geschrieben und der
vollstaendige Gate-Lauf (`db reset --local` / `db lint` / `test db`) wurde am selben Tag nach
separater Freigabe ausgefuehrt: **Ergebnis PASS, 4 Dateien, 32 Tests, 0 Fehler.**

Der erste Lauf deckte zwei reale Luecken auf (sieben `SECURITY DEFINER`-Funktionen ohne festen
`search_path`, fehlende `supabase_realtime`-Publication-Zuordnung fuer `chat_messages`), die durch
die additive Migration `20260719145330_harden_definer_search_path_and_realtime.sql` behoben
wurden. Ausserdem musste die Baseline-Migration selbst angepasst werden: zwoelf
`ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin ...`-Anweisungen aus dem `pg_dump` liessen sich
lokal nicht abspielen (Rolle `postgres` darf sich laut Supabase-Design nicht per `SET ROLE` zu
`supabase_admin` machen) und wurden in `20260719133741_live_schema_baseline.sql` auskommentiert
(mit Begruendung im Dateikommentar); die parallelen `FOR ROLE postgres`-Grants blieben aktiv.

Jede Datei ist in `begin; ... rollback;` gekapselt (Supabase-Standardmuster fuer pgTAP-Dateien)
und referenziert die konkrete Quelle ihrer Erwartungswerte im Kopfkommentar.

## Vorhandene Tests

| Datei | Prueft |
|---|---|
| `0001_baseline_structure_counts.sql` | Objekt-Zaehlwerte (Tabellen, RLS, View, Funktionen, `SECURITY DEFINER`, Policies, Sequenzen, Constraints, Indizes, Trigger) gegen den Kataloglauf vom 18.07./Schema-Dump vom 19.07.2026 |
| `0002_security_definer_functions.sql` | Jede der neun `SECURITY DEFINER`-Routinen einzeln: Existenz + `SECURITY DEFINER`-Flag + expliziter `search_path`. Urspruenglich schlugen 7 von 9 Funktionen fehl (kein fixer `search_path`); behoben durch die Haertungsmigration, jetzt gruen. |
| `0003_view_reloptions.sql` | `intensivwoche_kurse_mit_anmeldungen` existiert und hat `security_invoker = true` (bekannte Diff-Tool-Luecke bei View-Optionen) |
| `0004_realtime_publication.sql` | `supabase_realtime` publiziert exakt `public.chat_messages` (bekannte Diff-Tool-Luecke bei Publications, da `pg_dump --schema-only` Publication-Zuordnungen nicht mit ausgibt). Urspruenglich 0 statt 1 Tabelle; behoben durch die Haertungsmigration, jetzt gruen. |
| `0005_booking_hardening.sql` | Buchungshaertungen Phase A (Migration `20260719190025_booking_hardening_phase_a.sql`): familienfaehiger Duplikatschluessel, `idempotency_key`, Format-/Laengen-Checks, unveraenderlicher Preis-Snapshot, minimale Grants. |
| `0006_booking_hardening_phase_b.sql` | Buchungshaertungen Phase B (Migration `20260720090000_booking_hardening_phase_b_rate_limit.sql`): dauerhafter Rate-Limiter (5 Versuche / 10 Minuten je `parent_email`, kursuebergreifend), idempotency_key-Wiederholungen zaehlen nicht als neuer Versuch, minimale Grants + RLS auf `intensivwoche_buchungsversuche`. Der automatisierte Parallelitaetstest fuer den letzten freien Platz (Abschnitt 12, letzter Punkt) ist kein pgTAP-Test -- siehe `scripts/concurrency-test-booking.ts`. |

## Bewusst noch nicht abgedeckt

- **Storage-Buckets/-Policies.** `pg_dump --schema-only public` erfasst nur das `public`-Schema;
  Buckets sind Datenzeilen in `storage.buckets`, keine DDL, und wurden nie inventarisiert (die
  Leserolle hatte keinen `storage`-Zugriff, siehe Baseline-Bericht Abschnitt 6 "Storage-
  Abgrenzung"). Laufzeitcode referenziert mindestens die Buckets `student-essays`, `avatars`,
  `correction-rubrics` und `lernmaterialien` (Fundstellen u. a. in
  `app/(dashboard)/aufsaetze/actions.ts`, `app/(dashboard)/profil/actions.ts`,
  `app/(dashboard)/dashboard/materialien/actions.ts`) -- das ist eine grep-basierte
  Momentaufnahme, keine vollstaendige Live-Erhebung. Vor einem Bucket-bezogenen pgTAP-Test braucht
  es zuerst eine eigene, separat freizugebende Erhebung der tatsaechlichen Bucket-Konfiguration
  und -Policies.
- **Buchungshaertungen aus Abschnitt 12** (`step0Baseline.revision2.md`) sind jetzt vollstaendig
  umgesetzt (Phase A + Phase B, siehe `0005`/`0006` oben) bis auf den automatisierten
  Parallelitaetstest fuer den letzten freien Platz, der bewusst kein pgTAP-Test ist (echte
  Nebenlaeufigkeit braucht mehrere gleichzeitige Verbindungen) -- siehe
  `scripts/concurrency-test-booking.ts`.

Kein Test in diesem Verzeichnis darf gegen die Live-Datenbank laufen; das Gate arbeitet
ausschliesslich gegen die lokale, aus der Baseline neu aufgebaute Datenbank.
