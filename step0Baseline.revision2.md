# Schritt 0 — korrigierter Plan für Supabase-Baseline und Live-Inventar

**Status:** Revision 2, konsistent fortgeschrieben und erneut geprüft am 19.07.2026  
**Ausführungsstatus:** Noch nicht implementieren. Dieses Dokument beschreibt den freizugebenden
Read-only- und lokalen Prüfablauf. Es erteilt keine Freigabe für Downloads, Dateiänderungen,
Supabase-Linking, lokale Resets oder Remote-Schreiboperationen.

## 1. Ziel und harte Grenzen

Schritt 0 soll den echten Live-Strukturstand beweisbar inventarisieren und einen reproduzierbaren
neuen lokalen Baseline-Strang planen. Die historische lokale Migrationskette ist ausdrücklich kein
deploybarer Spiegel der Live-Historie.

Bis zu einer separaten, dokumentierten Freigabe sind verboten:

- `supabase init`, `supabase link`, `supabase migration repair`, `supabase db push` und
  `supabase db reset --linked`;
- jede Remote-DDL- oder Remote-DML-Operation;
- das Umbenennen, Bearbeiten, Verschieben oder Löschen bestehender Migrationsdateien;
- das Installieren, automatische Nachladen oder Aktualisieren einer CLI;
- das Ausgeben von Zugangsdaten, Tokens, Schlüsseln, DB-URLs oder personenbezogenen Zeilen;
- das Ausführen des aktuellen historischen Migrationsstrangs gegen eine leere Datenbank.

Ein SQL-Skript gilt nicht allein deshalb als read-only, weil es nur `SELECT` enthält. Remote-SQL
darf später nur mit einer dafür vorgesehenen, möglichst eingeschränkten DB-Rolle und innerhalb
einer `READ ONLY`-Transaktion ausgeführt werden. Es dürfen keine unbekannten oder schreibenden
Funktionen aufgerufen werden.

## 2. Verifizierter lokaler Ausgangsstand

### 2.1 Historische Migrationen

Im Verzeichnis `supabase/migrations/` liegen exakt diese zwölf Dateien:

1. `001_create_trainer_tables.sql`
2. `002_create_intensivwoche_anmeldungen.sql`
3. `002_create_student_essays.sql`
4. `003_create_intensivwoche_kurse.sql`
5. `004_fix_rls_policies.sql`
6. `005_create_mentorship_tables.sql`
7. `006_seed_test_data.sql`
8. `007_create_ai_correction_tables.sql`
9. `008_profiles_rls.sql`
10. `012_fix_mentorship_role_values.sql`
11. `013_add_booking_price_snapshot.sql`
12. `014_atomic_booking_function.sql`

Die Version `002` ist doppelt vergeben. Die Versionsnummern `009`, `010` und `011` kommen lokal
nicht vor. Nummernlücken sind für sich allein kein Fehler; die doppelte Version und die nicht
reproduzierbare Kette sind dagegen Blocker.

Der aktuelle Strang ist nicht leer-datenbankfähig:

- `001` setzt `public.profiles` voraus, legt die Tabelle aber nicht an;
- beide `002`-Dateien kollidieren versionsseitig;
- `002_create_intensivwoche_anmeldungen.sql` referenziert `public.courses`, bevor eine solche
  Tabelle lokal angelegt wird;
- `profiles` und `subjects` werden mehrfach vorausgesetzt, aber nicht kanonisch erzeugt;
- `003` enthält geschäftliche Beispieldaten;
- `006` enthält Auth-Testnutzer und weitere Testdaten;
- `007` schreibt Bucket-Konfiguration in `storage.buckets`.

Diese DML-Inhalte und historischen Defekte werden inventarisiert, aber nicht in eine neue
schema-only Baseline übernommen.

### 2.2 Lokale Konfiguration und Werkzeuge

- `supabase/config.toml` und `supabase.toml` fehlen.
- Eine globale Supabase CLI wurde nicht gefunden.
- `supabase` ist keine lokale Dependency und `node_modules/.bin/supabase` fehlt.
- `supabase/tests/` fehlt.
- Die vorhandenen `.env`-Dateien enthalten keine `SUPABASE_DB_URL`. Am 18.07.2026 wurde extern
  die eingeschränkte Login-Rolle `zap_baseline_reader` bereitgestellt; ihr temporäres Kennwort und
  die Verbindungsdaten werden bewusst nicht im Repository gespeichert.
- `.gitignore` lässt ausschließlich den bereinigten Baseline-Bericht zur Versionierung zu und
  ignoriert das private Evidenzverzeichnis vollständig.

Für Schritt 0 ist seit 18.07.2026 folgendes zusammengehöriges PostgreSQL-Clientpaar freigegeben
und durch `scripts/approved-postgres-tools.ps1` fest gepinnt:

- `psql`: `D:\Program Files\PostgreSQL\18\bin\psql.exe`, Version `18.4`, SHA-256
  `1116C77F820606F52CD3D0F676012470D494092CBA321A6CBD898F4701EB944E`;
- `pg_dump`: `D:\Program Files\PostgreSQL\18\bin\pg_dump.exe`, Version `18.4`, SHA-256
  `46C8AD2E487FA01BB5401AE3B383C09E20789EFDD3A37C6940975647EB1FF574`.

Windows führt die Installation als `PostgreSQL 18`, Paketversion `18.4-2`, Publisher
`PostgreSQL Global Development Group`, Installationsort `D:\Program Files\PostgreSQL\18`. Beide
Dateien melden denselben Hersteller in den Versionsmetadaten, sind aber nicht Authenticode-signiert;
deshalb sind die SHA-256-Prüfungen vor jeder Nutzung verbindlich. Die ebenfalls vorhandenen
17.9-Binaries und die pgAdmin-Runtime sind nicht für diesen Ablauf freigegeben. Vor einem
Live-Dump wird zusätzlich geprüft, dass die Server-Hauptversion nicht neuer als `pg_dump` 18 ist.

Die lokale Read-only-Verbindung wurde am 18.07.2026 über den IPv4-Session-Pooler erfolgreich
getestet. Gepinnt sind der Service `zap_baseline_readonly` in `supabase/pg_service.conf` und das
offizielle Supabase-CA-Zertifikat `supabase/prod-ca-2021.crt` mit SHA-256
`700723581420DD1AC98FD7E9AC529F0EF210EADCAF87FC868A3AD7D114C2F3B7`. TLS läuft mit
`verify-full`; der Test bestätigte `current_user = zap_baseline_reader`, PostgreSQL `17.4` und
`transaction_read_only = on`. `scripts/approved-db-connection.ps1` prüft Tool-, CA- und
Servicekonfiguration vor jeder Verwendung. Es enthält und speichert kein Kennwort.

Folge: `npm exec -- supabase ...` darf nicht verwendet werden. Wenn das Paket nicht lokal
installiert ist, kann `npm exec` es in den npm-Cache nachladen. Vor jedem späteren CLI-Einsatz muss
eine konkrete, geprüfte Version samt Herkunft und Prüfsumme freigegeben werden. Der tatsächlich
verwendete absolute Binary-Pfad und die Ausgabe von `supabase --version` beziehungsweise
`psql --version`/`pg_dump --version` werden im Bericht dokumentiert; keine Versionsnummer wird in
diesem Plan als angeblich „neueste“ festgeschrieben.

### 2.3 Referenzen auf `courses` und `course_occurrences`

Der Abgleich wird in drei Klassen geführt:

1. **Runtime-/App-Code:** Aktuell keine aktive DB-Abfrage auf diese Tabellen gefunden. Reine
   Dokumentation, generierte Dateien, Build-Ausgaben und Cache-Tag-Namen zählen nicht als
   Runtime-DB-Zugriff.
2. **SQL:** `002_create_intensivwoche_anmeldungen.sql` enthält einen historischen FK auf
   `public.courses`; eine lokale `CREATE TABLE`-Definition für `courses` oder
   `course_occurrences` fehlt.
3. **Generierte Typen:** `types/database.ts` enthält Definitionen für beide Tabellen und ihre
   Beziehung.

Die Live-Tabellen dürfen ungeachtet fehlender Runtime-Nutzung nicht als löschbar eingestuft
werden. Herkunft, Besitzer und fachliche Bedeutung müssen separat geklärt werden.

## 3. Verbindliche Ergebnisse von Schritt 0

Der Schritt ist erst vollständig, wenn der Bericht alle folgenden Teile enthält:

1. Projektidentität und UTC-Abfragezeitpunkt;
2. Remote-Migrationshistorie und Abgleich mit den lokalen Dateien;
3. ausschließlich nicht personenbezogene aggregierte Counts;
4. vollständige Soll-/Ist-Matrix der 27 Zieltabellen;
5. Prüfung der vier bekannten offenen Spalten;
6. DB-Level-Inventar aller relevanten Objektklassen;
7. getrennte Runtime-, SQL- und Typen-Suche für das zweite Kurstabellenpaar;
8. Dateistruktur und Erzeugungsplan des neuen Baseline-Strangs;
9. lokale Reset-, Lint-, pgTAP- und Schema-Diff-Strategie;
10. nicht-destruktive Rollback-Prinzipien;
11. Plan der noch offenen Buchungshärtungen;
12. Drift-, Sicherheits- und Abbruchkriterien.

## 4. Bericht und geschützte Artefakte

Der menschenlesbare Bericht erhält den festen Pfad:

`docs/migration-evidence/2026-07-18-supabase-baseline-inventory.md`

Rohausgaben werden getrennt darunter abgelegt:

`docs/migration-evidence/private/2026-07-18/`

Für die Artefakte gelten folgende Regeln:

- nur die minimal benötigten Metadaten und Aggregate speichern;
- niemals Secrets, DB-URLs, SQL-Statements aus der Migrationstabelle oder Datenzeilen speichern;
- keine Storage-Objektpfade oder Objektmetadaten exportieren;
- Zugriff auf Reviewer beschränken und Aufbewahrungs-/Löschentscheid dokumentieren;
- den Bericht vor Weitergabe automatisiert und manuell auf Secret-Muster prüfen;
- kleine Statusgruppen im Bericht als `<5` unterdrücken;
- Hashes der verwendeten SQL-Dateien und Rohausgaben dokumentieren, ohne Geheimnisse zu hashen
  und als Ersatzwert zu veröffentlichen.

`.gitignore` enthält eine enge Ausnahme ausschließlich für den bereinigten Markdown-Bericht. Das
private Unterverzeichnis und alle Rohinventare bleiben ignoriert. Vor einer Versionierung wird der
Bericht erneut automatisiert und manuell auf Geheimnisse und Datenzeilen geprüft.

## 5. Zugangsdaten und Projektidentität

### 5.1 Variablenpriorität

Wenn lokale dotenv-Dateien später ausdrücklich freigegeben werden, werden zuerst `.env`, danach
`.env.local` geladen; dadurch überschreiben gleichnamige Werte aus `.env.local` die Werte aus
`.env`. Es wird ein geprüfter dotenv-Parser verwendet, kein selbst gebautes Splitten an `=`.

Es gilt eine feste Allowlist. Für Schritt 0 relevant sind höchstens:

- `NEXT_PUBLIC_SUPABASE_URL` für den öffentlichen Projekthost;
- `SUPABASE_SERVICE_ROLE_KEY` ausschließlich für freigegebene PostgREST-HEAD-Counts;
- `SUPABASE_DB_URL` als mögliche, nur separat und sicher bereitgestellte Quelle für die
  DB-Verbindung; vor dem Clientstart wird sie in eine geschützte PostgreSQL-Servicekonfiguration
  oder in nicht ausgegebene `PG*`-Prozessvariablen überführt und nicht als CLI-Argument verwendet;
- `SUPABASE_PROJECT_REF` als erwarteter Vergleichswert;
- `SUPABASE_ACCESS_TOKEN` nur dann, wenn eine separat freigegebene Management-API-Abfrage nötig
  ist.

Werte werden weder auf stdout/stderr ausgegeben noch in Befehlszeilen, Berichte oder Debug-Logs
geschrieben. `SUPABASE_DB_URL` fehlt weiterhin im Repository. Die dafür vorgesehene externe Rolle
`zap_baseline_reader` ist bis 26.07.2026 00:00 UTC befristet und auf Read-only-Transaktionen,
zwei Verbindungen sowie minimale Schema- und Migrationsmetadatenrechte eingeschränkt. Für lokale
DB-Level-Abfragen muss ihre Verbindung noch ausschließlich im geschützten Clientkontext gesetzt
werden. Ein Service-Role-Key ersetzt keinen direkten Datenbankzugang.

### 5.2 Identitätsprüfung

Vor jeder Remote-Abfrage müssen mindestens drei voneinander abgeglichene Werte vorliegen:

- erwarteter Projekt-Ref;
- Host aus `NEXT_PUBLIC_SUPABASE_URL`;
- Host/Projektanteil der separat bereitgestellten DB-Verbindung.

Der Projekt-Ref ist keine UUID und wird auch nicht so bezeichnet. Der Projekt-Display-Name stammt
aus einer autorisierten Dashboard- oder Management-API-Quelle; er wird nicht aus der Datenbank
erfunden. Der Bericht nennt Quelle, Projekt-Ref und UTC-Zeitpunkt, aber keine Zugangsdaten.

Geprüfter Stand vom 18.07.2026: Dashboard-Display-Name `ZAP_25`; Projekt-Ref
`ybzdibifgqjsbohtztmy`. Dashboard-URL, `NEXT_PUBLIC_SUPABASE_URL` und Suffix des
Session-Pooler-Benutzers stimmen überein. Die Live-Verbindung bestätigte Datenbank `postgres`,
Benutzer `zap_baseline_reader`, PostgreSQL `17.4`, TLS und Read-only-Modus.

## 6. Read-only Live-Inventar

### 6.1 Aggregierte Counts ohne Zeilen

Für die sechs Kontrolltabellen werden ausschließlich echte HTTP-HEAD-Abfragen gegen PostgREST mit
`Prefer: count=exact` verwendet:

- `intensivwoche_kurse`
- `intensivwoche_anmeldungen`
- `subjects`
- `mentor_skills`
- `courses`
- `course_occurrences`

Es wird kein Response-Body angefordert oder gespeichert. Ausgewertet wird nur der Gesamtwert aus
`Content-Range`. Zulässige Statusverteilungen werden als einzelne HEAD-Abfragen mit einer festen
Allowlist bekannter Statuswerte durchgeführt; Werte kleiner fünf werden im Bericht unterdrückt.
Unbekannte Freitextwerte werden nie gruppiert oder ausgegeben.

Der datierte Kontrollstand aus `design-reference/datenmodell-review.md` lautet 8, 48, 10, 3, 4
und 8. Diese Zahlen sind Vergleichswerte, keine erwarteten Seeds. Jede Abweichung wird als Drift
mit UTC-Zeitpunkt dokumentiert und niemals automatisch korrigiert.

Live-Prüfung vom 18.07.2026: Alle sechs HEAD-Abfragen antworteten mit HTTP 200 und ergaben erneut
8, 48, 10, 3, 4 und 8. Der Drift beträgt für jede Kontrolltabelle null.

Kontroll-Revalidierung vom 19.07.2026: Die sechs HEAD-Counts blieben unverändert, alle acht
`intensivwoche_kurse` waren weiterhin aktiv und die REST-Schemabeschreibung bestätigte erneut die
5/22-Zielmatrix sowie das Fehlen der vier offenen Spalten. Dieser REST-Kontrolllauf ersetzt keinen
erneuten DB-Level-Abgleich der Migrationshistorie, Routinen, Grants, Trigger oder Policies.

### 6.2 Remote-Migrationshistorie

Die echte Supabase-Historie liegt normalerweise in
`supabase_migrations.schema_migrations`. Zuerst werden read-only die tatsächlich vorhandenen
Spalten dieser Tabelle ermittelt. Danach wird eine statische, an dieses Schema angepasste Abfrage
ausgeführt.

In den Bericht dürfen nur aufgenommen werden:

- `version`;
- `name`, falls die Spalte existiert;
- ein tatsächlicher Zeitstempel, nur falls eine entsprechende Spalte existiert;
- der abgeleitete Zustand `applied`, weil eine Zeile vorhanden ist.

`author`, `status` oder `inserted_at` werden nicht vorausgesetzt. Ein fehlender Datensatz beweist
keinen gespeicherten Status `reverted`. Das Feld `statements` wird niemals selektiert oder
exportiert, weil es Datenliterale und andere sensible Inhalte enthalten kann. Aus den dreistelligen
historischen Versionen wird kein UTC-Zeitpunkt abgeleitet.

Jede Remote-SQL-Datei enthält konzeptionell:

```sql
BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '30s';
-- ausschließlich vorab geprüfte Katalog-SELECTs
COMMIT;
```

Die spätere PowerShell-Ausführung erfolgt mit der freigegebenen, gepinnten `psql`-Binary. Das
Prüfskript wird im aktuellen Prozess dot-gesourct; es setzt die absoluten Pfade nur nach erfolgreicher
Versions- und Hashprüfung. Die Verbindung wird über eine geschützte PostgreSQL-Servicekonfiguration
oder nicht ausgegebene `PG*`-Prozessvariablen bereitgestellt, beispielsweise:

```powershell
. .\scripts\approved-db-connection.ps1
$env:PGSERVICEFILE = $ApprovedPgServiceFile
$env:PGSSLROOTCERT = $ApprovedSupabaseCaPath
$env:PGPASSWORD = Read-Host 'Temporäres DB-Kennwort' -MaskInput
try {
    & $ApprovedPsqlPath -X --no-password --set=ON_ERROR_STOP=1 `
        "service=$ApprovedPgServiceName" --file .\scripts\read_migrations.sql
} finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:PGSERVICEFILE -ErrorAction SilentlyContinue
    Remove-Item Env:PGSSLROOTCERT -ErrorAction SilentlyContinue
}
```

`$ApprovedPsqlPath`, das Ziel und die geschützte Verbindungsquelle müssen vorher validiert sein.
Der Befehl darf nicht mit Debug-Tracing oder Transcript-Logging ausgeführt werden. Dieses Beispiel
wurde am 18.07.2026 mit `scripts/read-live-inventory.sql` erfolgreich ausgeführt. Das private
Rohinventar liegt unter `docs/migration-evidence/private/2026-07-18/`; der bereinigte Bericht steht
in `docs/migration-evidence/2026-07-18-supabase-baseline-inventory.md`.

## 7. Vollständiges DB-Level-Schema-Inventar

PostgREST/OpenAPI bleibt ein ergänzender Sichtbarkeitstest und ist kein DDL-Nachweis. Der
schema-only Dump des Anwendungsschemas wird später mit einer freigegebenen, zur Server-Hauptversion
passenden `pg_dump`-Binary erzeugt. Der portable Baseline-Dump verwendet `--schema-only` und
`--no-owner`; die tatsächlichen Owner werden getrennt inventarisiert. Es werden keine Daten und
keine Secret-/Debug-Ausgaben erzeugt. ACLs dürfen nicht durch `--no-acl` entfernt werden. Da auch
ein schema-only Dump kurzzeitig Katalogzugriffe und Locks verursacht, braucht seine Ausführung ein
freigegebenes Zeitfenster und enge Timeouts.

Das Inventar und der Dump müssen mindestens abdecken:

- Schemas, Tabellen, Partitionen, Spalten, Typen, Collations, Defaults, Identity und Generated
  Columns;
- Primary-, Foreign-, Unique-, Exclusion- und Check-Constraints inklusive vollständiger
  Definition und FK-Ziel;
- normale, partielle, funktionale und Unique-Indizes;
- Sequenzen und deren Ownership;
- Enums, Domains und weitere benutzerdefinierte Typen;
- Views und Materialized Views inklusive Definition, Owner und `reloptions` wie
  `security_invoker`; „security definer“ wird nicht als View-Option erfunden;
- Trigger ohne interne Systemtrigger, jeweils mit `pg_get_triggerdef`;
- Funktionen und Prozeduren inklusive Signatur, Definition, Sprache, Volatilität, Parallelmodus,
  Owner, `SECURITY DEFINER`/`SECURITY INVOKER`, Konfiguration und sicherheitsrelevantem
  `search_path`;
- Table-, Column-, Sequence-, Schema- und Routine-Grants sowie Default Privileges;
- RLS-Aktivierung und `FORCE ROW LEVEL SECURITY` aus `pg_class` sowie Policy-Name, Command,
  Rollen, `USING` und `WITH CHECK`;
- relevante Extensions und Realtime-Publications, sofern sie zur Anwendung gehören;
- Storage-RLS-Policies auf `storage.objects` und gegebenenfalls `storage.buckets`.

Geeignete Quellen sind unter anderem `information_schema.columns`,
`information_schema.table_constraints`, `information_schema.referential_constraints`,
`information_schema.key_column_usage`, `information_schema.constraint_column_usage`,
`information_schema.table_privileges`, `column_privileges`, `routine_privileges`,
`sequence_privileges`, `pg_constraint`, `pg_indexes`, `pg_trigger`, `pg_proc`, `pg_namespace`,
`pg_type`, `pg_class`, `pg_views`, `pg_matviews`, `pg_policy`, `pg_default_acl`, `pg_extension` und
`pg_publication`.

`information_schema` zeigt abhängig von der Abfragerolle nur sichtbare Objekte. Vollständigkeit
muss deshalb durch Abgleich mit dem schema-only Dump und explizite Objekt-Counts bewiesen werden.
Funktionen werden nicht pauschal „einer Tabelle zugeordnet“; dokumentiert werden konkrete
Abhängigkeiten über Trigger, Constraints, Policies, Views oder nachweisbare Katalog-Dependencies.

### Storage-Abgrenzung

Eine Tabelle `storage.policies` wird nicht vorausgesetzt. Policies werden über `pg_policy` an
`storage.objects` beziehungsweise `storage.buckets` ermittelt. Bucket-Konfigurationen sind
Datenzeilen in `storage.buckets`, keine DDL-Objekte. Für das Inventar dürfen nur Bucket-ID/-Name,
Public-Flag, Größenlimit und erlaubte MIME-Typen gelesen werden, sofern diese Metadaten fachlich
freigegeben sind. Objektzeilen, Pfade, Besitzer und Metadaten aus `storage.objects` werden niemals
exportiert.

Bucket-Konfigurationen werden nicht automatisch Teil der schema-only Baseline. Ihre spätere
deklarative Wiederherstellung benötigt eine eigene fachliche Freigabe und einen getrennten,
idempotenten Konfigurationsschritt.

## 8. Soll-/Ist-Matrix der 27 Zieltabellen

Der Bericht prüft exakt diese Matrix und übernimmt keine alten Werte ungeprüft:

| Gruppe | Erwarteter Kontrollstand vom 18.07.2026 |
|---|---|
| vorhanden | `profiles`, `subjects`, `intensivwoche_kurse`, `intensivwoche_anmeldungen`, `learning_materials` |
| Katalog fehlt | `offers`, `offer_editions`, `course_sessions` |
| Materialzugriff fehlt | `material_areas`, `self_study_enrollments`, `material_access_grants` |
| Tagesfreigaben fehlen | `release_content_catalog`, `course_days`, `daily_releases`, `daily_release_items` |
| Arbeitszeit/Lohn fehlen | `teacher_assignments`, `work_entries`, `teacher_rate_agreements`, `payroll_periods`, `payroll_snapshots`, `payroll_snapshot_lines` |
| Finanzen fehlen | `financial_events`, `expense_entries`, `financial_periods`, `budgets`, `financial_adjustments` |
| Audit fehlt | `audit_log` |

Zusätzlich werden folgende bekannte Spalten geprüft:

- in `intensivwoche_anmeldungen`: `idempotency_key`, `edition_id`, `session_id`;
- in `learning_materials`: `area_id`.

Vorhandensein oder Fehlen wird ausschließlich dokumentiert. Schritt 0 legt keine dieser Tabellen
oder Spalten remote an.

## 9. Neuer lokaler Baseline-Strang

Nach separater Freigabe ist folgende Zielstruktur vorgesehen:

```text
supabase/
├── config.toml
├── legacy-migrations/
│   └── 001–014 unverändert als historische Referenz
├── migrations/
│   ├── N YYYYMMDDHHMMSS_remote_name.sql als reine Remote-History-Marker
│   ├── YYYYMMDDHHMMSS_live_schema_baseline.sql
│   └── spätere additive Migrationen
├── seed.sql
└── tests/
    └── database/
```

Regeln:

- Die historischen Dateien bleiben byte-identisch und werden vor/nach dem Verschieben gehasht.
- Für jeden unmittelbar vor der Baseline erneut bestätigten Remote-Migrationseintrag liegt im
  ausführbaren Strang eine Datei mit **demselben 14-stelligen Zeitstempel und Namen**. Diese
  History-Marker enthalten ausschließlich Kommentare und kein SQL. Sie bewahren die vorhandene
  Remote-Historie für den CLI-Zeitstempelvergleich, während beim lokalen Reset erst die spätere
  Baseline das Schema erzeugt. Marker werden nie aus dem sensiblen Feld `statements` rekonstruiert.
- Der neue ausführbare Strang beginnt mit einem UTC-Zeitstempelpräfix
  `YYYYMMDDHHMMSS_beschreibung.sql`.
- Die Baseline enthält notwendige Schemata und Spaltendefinitionen, auch wenn Spalten
  personenbezogene Werte speichern können; sie enthält aber keinerlei Datenzeilen oder reale
  Werte.
- Geschäfts-, Auth- und Testdaten werden nicht übernommen.
- `supabase/seed.sql` darf später ausschließlich klar erkennbare synthetische lokale Fixtures
  enthalten und wird nie automatisch remote ausgerollt.
- Bestehende Remote-Versionen werden weder umbenannt noch an die historischen lokalen Versionen
  `001`–`014` oder andere Fantasieversionen angepasst.

### 9.1 Verbindliche Adoption der Baseline-Historie

Alle unmittelbar vor der Baseline erneut bestätigten Remote-Zeitstempel werden durch reine
Kommentar-Marker lokal abgebildet. Die neue Baseline-Datei ist auf dem bestehenden Remote-Projekt
dagegen zunächst nicht als Migration registriert. Ohne einen History-Abgleich würde ein späteres
`db push` versuchen, ihr SQL gegen das bereits vorhandene Live-Schema auszuführen. Deshalb gilt
nach dem vollständig grünen lokalen Gate ein eigener, noch separat freizugebender Remote-Schritt:

1. Live-Identität, vollständige Migrationshistorie und Schema-Drift erneut read-only prüfen.
2. Backup-/Restore-Nachweis, Baseline-Hash, Schema-Gleichheit und Vier-Augen-Freigabe protokollieren.
3. Mit der exakt gepinnten CLI `supabase migration list` vor der Änderung sichern und beweisen,
   dass alle Remote-Zeitstempel durch exakt passende lokale History-Marker abgedeckt sind und nur
   die neue Baseline lokal als ausstehend erscheint.
4. Ausschließlich die neue Baseline-Version mit
   `supabase migration repair <baseline-version> --status applied` als bereits angewendet
   registrieren. Dieser Befehl darf das Baseline-SQL nicht ausführen.
5. `supabase migration list` erneut sichern und mit `supabase db push --dry-run` beweisen, dass nur
   additive Migrationen **nach** der Baseline ausstehen. Bei jeder anderen Ausgabe abbrechen.

Diese einmalige Baseline-Adoption ist die einzige vorgesehene Ausnahme vom Verbot für
`migration repair`. Die Remote-Einträge und lokalen historischen Dateien `001`–`014` werden nicht
repariert, gelöscht, umbenannt oder umgeschrieben. Ein tatsächlicher `db push` benötigt danach
weiterhin eine eigene Rollout-Freigabe.

## 10. Lokales Gate und korrekte Reihenfolge

Das Gate wird erst nach Freigabe und erst gegen den neuen Baseline-Strang ausgeführt. Es darf nicht
gegen die aktuelle historische Kette gestartet werden.

Voraussetzungen:

1. freigegebene, gepinnte Supabase CLI und kompatible Docker-/Container-Runtime;
2. bewusst erzeugte und reviewte `supabase/config.toml` mit passender PostgreSQL-Hauptversion;
3. historische Dateien aus dem ausführbaren Verzeichnis entfernt und unverändert archiviert;
4. bereinigte schema-only Baseline vorhanden;
5. pgTAP-Tests unter `supabase/tests/database/` vorhanden;
6. keine echte Live-Verbindung im lokalen Gate-Prozess.

Vorgesehene Befehle, noch nicht auszuführen:

```powershell
& $ApprovedSupabasePath db reset --local --no-seed
& $ApprovedSupabasePath db lint --local --level error --fail-on error
& $ApprovedSupabasePath test db .\supabase\tests\database --local
```

Vor Ausführung wird die Syntax nochmals mit der exakt gepinnten Version und deren lokaler
`--help`-Ausgabe abgeglichen. Ein Schema-Diff ist nur ein Teilnachweis: bekannte Tool-Lücken bei
Storage-Buckets, Publications und View-Optionen werden durch gezielte Katalogtests ergänzt.

### Gate-Abbruchkriterien

- Reset, Lint oder pgTAP ist nicht grün;
- Objekt-Counts oder Definitionen weichen unerklärt ab;
- Constraints, Grants, Funktionen, Trigger, View-Optionen, RLS oder Storage-Policies fehlen;
- Funktionsdefinitionen enthalten unerwartete Secrets oder unsichere `search_path`-Werte;
- der Dump enthält DML, Auth-/Geschäfts-/Testdaten oder echte Datenwerte;
- Projektidentität oder DB-Ziel ist nicht zweifelsfrei bestätigt;
- kleine Gruppen oder personenbezogene Inhalte gelangen in Bericht oder Artefakte.

## 11. Diff- und Rollback-Strategie

- Der Vergleich erfolgt zwischen dem inventarisierten Live-Strukturstand und einer aus dem neuen
  lokalen Baseline-Strang frisch aufgebauten Datenbank.
- Verglichen werden normalisierte Definitionen und Objekt-Counts, nicht Datenzeilen.
- Jede bekannte Diff-Engine-Lücke erhält einen gezielten SQL-/pgTAP-Test.
- Nach der Baseline sind Migrationen additiv und einzeln reviewbar.
- Ein Anwendungsrollback schaltet zuerst Routen oder Feature-Flags zurück; er löscht keine
  Bestandsdaten.
- Bereits genutzte Tabellen, Spalten oder Remote-Migrationsversionen werden nicht destruktiv
  zurückgerollt.
- Ein Live-Rollout und dessen Rollback benötigen später eine eigene Checkliste, Backup-/Restore-
  Nachweis, Verantwortliche und separate Freigabe.

## 12. Offene Buchungshärtungen

Schritt 0 implementiert diese Punkte nicht, hält sie aber verbindlich für spätere additive
Migrationen und Tests fest:

- familienfähiger Duplikatschlüssel, der legitime Geschwisterbuchungen nicht blockiert;
- eindeutiger `idempotency_key` für Request-Wiederholungen;
- DB-seitige Pflichtfeld-, Format- und Maximallängen-Checks;
- nach dem Insert unveränderliche Preis-, Währungs-, Editions-, Session- und Idempotenz-Snapshots;
- minimale Grants und überprüfte RLS/RPC-Berechtigungen;
- dauerhafter, serverseitiger Rate-Limiter;
- automatisierter Parallelitätstest für den letzten freien Platz;
- Tests für identische Wiederholungen, Geschwister, direkte anonyme RPC-Eingaben und manipulierte
  Snapshotwerte.

## 13. Reviewer-Checkliste vor der ersten Implementierungsfreigabe

- [x] Projektidentität aus Dashboard, öffentlicher URL und Pooler-Ziel abgeglichen
- [x] Read-only DB-Rolle separat bereitgestellt und eingeschränkt (18.07.2026; befristet bis
  26.07.2026 00:00 UTC; Verbindungsgeheimnis nicht im Repository)
- [x] `psql`/`pg_dump` 18.4 mit absoluten Pfaden, Herkunft und SHA-256-Prüfsummen gepinnt
- [x] Lokale Read-only-Verbindung mit `verify-full`, offizieller CA und Session-Pooler geprüft
- [x] Keine automatische CLI-Installation vorgesehen
- [x] Lokale und Remote-Migrationshistorie ohne `statements` abgeglichen
- [x] Sechs HEAD-Counts und Drift dokumentiert
- [x] 27-Tabellen-Matrix und vier offene Spalten geprüft
- [x] Runtime-, SQL- und Typenreferenzen getrennt dokumentiert
- [x] Bereinigten schema-only Dump erzeugt, geprüft und mit ergänzenden Katalogchecks abgeglichen
  (19.07.2026; SHA-256 `47CA58A401A5C7C4F8E71FBFCA42B8CA62248A392483DDB2320274C44E7E8527`; 26
  Tabellen, 1 View, 15 Funktionen davon 9 `SECURITY DEFINER`, 131 Policies, 12 Sequenzen, 84
  Constraints, 72 Indizes, 9 Trigger — exakte Übereinstimmung mit dem Kataloglauf vom 18.07.2026,
  kein Drift; 0 Top-Level-Datenanweisungen, 0 Geheimnismuster)
- [x] Storage-Policies und Bucket-Konfiguration korrekt getrennt
- [x] Bereinigter Bericht eng versionierbar; private Artefakte geschützt und ignoriert
- [x] Baseline-Struktur, History-Adoption, Gate-Reihenfolge, Diff und Rollback dokumentiert
- [x] Buchungshärtungen als spätere Pflichtpunkte erfasst
- [x] Keine Datei-, Local-DB- oder Remote-Mutation ohne separate Freigabe

## 14. Nachtrag 19.07.2026 — Lokales Gate ausgeführt (Abschnitt 9 und 10)

Nach expliziter, separater Freigabe in der Konversation wurden Abschnitt 9 (lokaler
Baseline-Strang) und Abschnitt 10 (lokales Gate) ausgeführt:

- Supabase CLI `2.109.1` manuell heruntergeladen (nicht per Paketmanager/Autoupdate), SHA-256 der
  ZIP-Datei gegen die offizielle `checksums.txt` von `github.com/supabase/cli` geprüft, SHA-256 der
  daraus entpackten `supabase.exe` in `scripts/approved-supabase-cli.ps1` gepinnt und bei jeder
  Nutzung verifiziert. Korrigiert damit den Checklistenpunkt „Keine automatische CLI-Installation
  vorgesehen" oben: Es *gab* eine Installation, aber eine manuelle, gepinnte, geprüfte — keine
  automatische.
- `supabase/config.toml` bewusst manuell erzeugt (nicht per `supabase init` im Projekt, siehe
  Verbotsliste in Abschnitt 1), Template stammt aus einem isolierten, projektfremden Testverzeichnis
  mit derselben gepinnten CLI; `db.major_version = 17` entspricht der bestätigten Live-Version.
- pgTAP-Tests unter `supabase/tests/database/` geschrieben (Details siehe dortiges README).
- `supabase db reset --local`, `db lint --local --level error --fail-on error` und `test db`
  ausgeführt. Erster Lauf deckte zwei reale Lücken auf: sieben `SECURITY DEFINER`-Funktionen ohne
  festen `search_path`, sowie eine fehlende `supabase_realtime`-Publication-Zuordnung für
  `chat_messages` (Dump-Tool-Lücke, siehe Abschnitt 10 oben). Beide behoben durch die additive
  Migration `20260719145330_harden_definer_search_path_and_realtime.sql`.
- Zusätzlich musste `20260719133741_live_schema_baseline.sql` angepasst werden: zwölf
  `ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin ...`-Anweisungen aus dem `pg_dump` sind lokal
  nicht abspielbar, weil die Rolle `postgres` sich (wie auf der Supabase-Plattform selbst) nicht per
  `SET ROLE` zu `supabase_admin` machen darf. Auskommentiert mit Begründung im Dateikommentar; die
  parallelen `FOR ROLE postgres`-Grants blieben aktiv und unverändert.
- **Ergebnis: Gate PASS.** `db lint`: keine Schema-Fehler. `test db`: 4 Dateien, 32 Tests, 0
  Fehler.

### Remote-Adoption (Bookkeeping), ebenfalls 19.07.2026

Nach erneuter, separater Freigabe explizit für `supabase link`/`supabase migration repair`
(Verbotsliste Abschnitt 1) wurde die Baseline-Version remote als „applied" registriert:

- Verbindung über `--db-url` statt `supabase link`/`supabase login` (Owner-Rolle `postgres`,
  Session-Pooler `aws-0-eu-central-2.pooler.supabase.com:5432`), da der interaktive Browser-Login
  in dieser Umgebung nicht ausführbar ist. Passwort wurde ausschließlich vom Nutzer selbst in einem
  eigenen PowerShell-Fenster eingegeben, nie an die Konversation übergeben.
- **Abweichung vom sonstigen TLS-Standard:** `sslmode=verify-full` schlug für die Supabase-CLI
  (Go-Binary) mit einer nicht weiter diagnostizierbaren generischen Fehlermeldung fehl
  (`PgClient: Failed to connect`, auch mit `--debug`/`--dns-resolver https` unverändert), obwohl
  `psql` mit identischen Zugangsdaten gegen denselben Host sofort erfolgreich verband. Nach
  bewusster, dokumentierter Abwägung wurde für diesen einen, kurzen Bookkeeping-Vorgang
  `sslmode=require` verwendet (verschlüsselt, aber ohne Zertifikatsprüfung) — eine Abweichung vom
  `verify-full`-Standard, den `psql`/`pg_dump` im übrigen Projekt durchgängig einhalten. Ursache
  nicht abschließend geklärt; falls die Supabase-CLI erneut remote gebraucht wird, sollte
  `verify-full` erneut versucht werden.
- `supabase migration list --db-url ...` bestätigte vor dem Repair: alle 20 Marker bereits
  Local+Remote identisch (kein Repair nötig), `20260719133741` (Baseline) und `20260719145330`
  (Härtung) beide nur Local.
- `supabase migration repair 20260719133741 --status applied --db-url ...` ausgeführt — schreibt
  ausschließlich in `supabase_migrations.schema_migrations` (Bookkeeping), keine Änderung am
  Anwendungsschema. Erneutes `migration list` bestätigt: `20260719133741` jetzt Local+Remote,
  `20260719145330` weiterhin bewusst nur Local/ausstehend.

`supabase db push --dry-run --db-url ...` (ebenfalls 19.07.2026, separat freigegeben) bestätigte:
**ausschließlich** `20260719145330_harden_definer_search_path_and_realtime.sql` würde gepusht —
keine der 20 historischen Dateien, kein unerwarteter Drift. Reiner Lesevorgang, keine Schreibwirkung
auf die Live-Datenbank.

### Echter Push der Härtungsmigration, ebenfalls 19.07.2026

Nach separater, expliziter finaler Freigabe wurde `supabase db push --db-url ...` (ohne
`--dry-run`) gegen die Live-Datenbank ausgeführt.

- **Vorab korrigiert:** Die ursprüngliche Fassung von `20260719145330_harden_definer_search_path_and_realtime.sql`
  enthielt ein unbedingtes `ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;`.
  Da diese Zuordnung auf der Live-DB laut Kataloglauf vom 18.07.2026 bereits existierte (die lokale
  Lücke war nur ein Artefakt des `pg_dump --schema-only`, siehe oben), hätte das remote einen
  "already member of publication"-Fehler ausgelöst und die gesamte Transaktion zurückgerollt. Vor
  dem Push per `DO`-Block mit Existenzprüfung idempotent gemacht (lokal weiterhin wirksam, remote
  ein No-op), lokal erneut reset/lint/pgTAP-geprüft (weiterhin PASS), erst danach gepusht.
- Der CLI-Lauf zeigte eine nicht-fatale Warnung ("failed to cache migrations catalog", ausgelöst
  durch einen fehlenden Zertifikatspfad im internen `pg-delta`-Edge-Runtime-Sandbox unter Windows)
  — betraf nur das optionale Diff-Katalog-Caching nach dem Push, nicht die Migration selbst.
- **Verifiziert (rein lesend, gegen die echten Objekte, nicht nur die Bookkeeping-Tabelle):** Alle
  sieben Funktionen zeigen jetzt `proconfig = {"search_path=\"\""}`; `supabase_realtime` enthält
  weiterhin genau eine Zeile (`public.chat_messages`, kein Duplikat). `migration list` bestätigt
  `20260719145330` jetzt Local+Remote.
- **Ergebnis: Live-Datenbank ZAP_25 entspricht jetzt vollständig dem gehärteten, getesteten
  Baseline-Strang.** Das ist der einzige echte Remote-Schreibvorgang (Anwendungsschema) dieser
  gesamten Schritt-0-Durchführung.

### Storage-Bucket- und Policy-Erhebung, ebenfalls 19.07.2026

Nach separater Freigabe erhoben (Details:
`docs/migration-evidence/2026-07-18-supabase-baseline-inventory.md`, Abschnitt 15). Kurzfassung:
5 Buckets (`avatars`, `learning_materials`, `lernmaterialien`, `student-essays`,
`correction-rubrics`) mit Konfiguration erhoben; 15 RLS-Policies auf `storage.objects`
dokumentiert. Ein befristeter `GRANT` an `zap_baseline_reader` scheiterte strukturell und **ohne
sichtbare Fehlermeldung** (Rolle `postgres` besitzt `storage`-Rechte selbst nur ohne
`WITH GRANT OPTION`, Owner ist `supabase_admin`) — Bucket-Konfiguration stattdessen über die
Storage-REST-API mit `service_role`-Key gelesen. **Fund:** `learning_materials` ist ein
vermutlich verwaister Bucket ohne RLS-Policy und ohne Code-Referenz — keine Korrektur
vorgenommen, eigene künftige Entscheidung.

### Buchungshärtungen Phase A, ebenfalls 19.07.2026

Fünf der acht Punkte aus Abschnitt 12 umgesetzt (Plan `optimized-wobbling-thompson.md`); Rate-
Limiter und Concurrency-Test bleiben bewusst Phase B. Migration
`20260719190025_booking_hardening_phase_a.sql`:

- **Familienfähiger Duplikatschlüssel:** `book_intensivwoche_kurs()` vergleicht jetzt zusätzlich
  den Kindernamen, nicht mehr nur Eltern-E-Mail + Kurs — Geschwister können sich beide anmelden.
  Der zugehörige Unique-Index wurde ersetzt (der alte, zu enge Index hätte sonst weiterhin
  blockiert).
- **`idempotency_key`:** neue `uuid`-Spalte + Unique-Index; wiederholte Aufrufe mit demselben
  Schlüssel liefern die ursprüngliche Buchungs-ID zurück statt eines Fehlers oder Duplikats.
  App-Code (`actions.ts`, beide Buchungs-Modals) erzeugt den Schlüssel jetzt clientseitig
  (`crypto.randomUUID()`, stabil pro Formularsitzung).
- **DB-seitige Format-/Längen-Checks:** sechs neue CHECK-Constraints, `NOT VALID` (sofort wirksam
  für neue Zeilen, kein Scan der Bestandsdaten) — `VALIDATE CONSTRAINT` ist ein bewusst
  nachgelagerter, noch offener Schritt (erst nach Live-Datenprüfung auf Verletzer).
- **Unveränderlicher Preis-/Währungs-Snapshot:** neuer `BEFORE UPDATE`-Trigger blockiert
  Änderungen an `booked_price_rappen`/`currency`, auch für Admins und `service_role`.
- **Minimale Grants:** `book_intensivwoche_kurs()` komplett neu erzeugt (nicht `CREATE OR REPLACE`
  — ein angehängter Parameter hätte sonst eine zweite, überlappende Funktion mit
  PUBLIC-Standardrechten erzeugt statt die alte zu ersetzen).

**Während der lokalen Browser-Verifikation gefundene und behobene Regression:** Das ursprünglich
geplante `REVOKE ALL ... FROM anon` hätte die öffentliche Kursliste komplett lahmgelegt — die
View `intensivwoche_kurse_mit_anmeldungen` (`security_invoker='true'`) liest intern von
`intensivwoche_anmeldungen`, um Teilnehmerzahlen zu aggregieren, und läuft dabei mit den Rechten
des Aufrufers. Korrigiert: `anon` behält `SELECT`, verliert aber alles andere. Nebenbefund
(vorbestehend, nicht Teil dieser Migration, nicht behoben): mangels RLS-Policy für `anon` auf
dieser Tabelle war die angezeigte Teilnehmerzahl für anonyme Besucher vermutlich schon immer 0.

**Verifiziert:** lokal 47/47 pgTAP-Tests grün, Lint fehlerfrei, echte Buchung über den Browser
gegen den lokalen Stack bestätigt (inkl. `idempotency_key` und Preis-Snapshot). `db push --dry-run`
zeigte ausschließlich diese eine Migration. Nach echtem Push gegen die echten Objekte verifiziert
(nicht nur `migration list`): 6 CHECK-Constraints vorhanden (`convalidated=false` wie geplant),
alter Familien-Index ersetzt, neuer Trigger vorhanden, Funktion mit `pronargs=9`, Grants exakt wie
beabsichtigt (`anon`: nur SELECT; `authenticated`: DELETE/SELECT/UPDATE).

### VALIDATE CONSTRAINT-Abschluss, ebenfalls 19.07.2026

Vorab read-only gegen die Live-Daten geprüft (`0` Verletzer bei allen sechs Constraints unter den
48 Bestandszeilen). Additive Migration `20260719200303_validate_anmeldungen_check_constraints.sql`
mit sechs `VALIDATE CONSTRAINT`-Anweisungen — reiner Scan, keine Datenänderung. Lokal 48/48
pgTAP-Tests grün (neue Prüfung ergänzt: alle sechs Constraints `convalidated = true`),
`db push --dry-run` zeigte ausschließlich diese eine Migration, nach echtem Push gegen die echten
Objekte verifiziert: alle sechs Constraints jetzt `convalidated = true`. Damit ist
**Buchungshärtungen Phase A vollständig abgeschlossen.**

**Noch offen (Stand nach Phase A):**
- Der verwaiste `learning_materials`-Bucket (siehe Storage-Erhebung oben).
- Buchungshärtungen Phase B (Rate-Limiter, Concurrency-Test für den letzten Platz).

### Buchungshärtungen Phase B, 20.07.2026

Letzte zwei Punkte aus Abschnitt 12 umgesetzt. Migration
`20260720090000_booking_hardening_phase_b_rate_limit.sql`:

- **Dauerhafter, serverseitiger Rate-Limiter:** neue Tabelle
  `intensivwoche_buchungsversuche` (RLS aktiviert, keine Policies, keine Grants an
  `anon`/`authenticated` — einziger Zugriffspfad ist die SECURITY DEFINER Funktion, die als
  Tabelleneigentümer läuft). `book_intensivwoche_kurs()` zählt darüber max. 5 Versuche pro
  `parent_email` innerhalb eines gleitenden 10-Minuten-Fensters, kursübergreifend. Persistiert in
  der DB statt In-Memory, damit der Limiter Kaltstarts/Neuverbindungen übersteht. Geprüft direkt in
  der Funktion (nicht nur in der Server Action), damit auch direkte anonyme RPC-Aufrufe erfasst
  werden. Ein per `idempotency_key` erkannter Wiederholungsaufruf zählt bewusst nicht als neuer
  Versuch (Kurzschluss vor der Rate-Limit-Prüfung, unverändert seit Phase A) — ein Netzwerk-Retry
  mit demselben Schlüssel verbraucht kein Kontingent. `CREATE OR REPLACE` genügte (Signatur
  unverändert seit Phase A), Grants explizit erneut gesetzt.
- **Automatisierter Parallelitätstest für den letzten freien Platz:** pgTAP läuft in einer
  einzigen Session und kann echte Nebenläufigkeit nicht abbilden — stattdessen eigenständiges
  Skript `scripts/concurrency-test-booking.ts`. Legt einen Testkurs mit `max_teilnehmer = 1` an,
  feuert 10 gleichzeitige RPC-Aufrufe als `anon` (wie ein echter Client) und prüft: genau 1 Erfolg,
  9× `voll`, genau 1 Zeile in der Tabelle. Verweigert den Lauf, wenn
  `NEXT_PUBLIC_SUPABASE_URL` nicht nach `127.0.0.1`/`localhost` aussieht (legt/löscht Testdaten
  mit `service_role`).

**Verifiziert, ausschließlich lokal:** `db reset --local` (Migration wendet sauber an), `db lint
--local --level error` fehlerfrei, `test db` **58/58 pgTAP-Tests grün** (Struktur-Zähltest 0001
angepasst: +1 Tabelle, +1 Sequenz, +1 Constraint, +2 Indizes gegenüber Phase A; neue Datei 0006 mit
10 Tests für Rate-Limiter/Grants/RLS). `scripts/concurrency-test-booking.ts` lokal ausgeführt:
1 Erfolg / 9× `voll` / 1 Tabellenzeile bei 10 parallelen Versuchen auf einen einzelnen freien
Platz — kein Overbooking, Exit-Code 0.

**Noch offen:** Push dieser Migration gegen das echte Projekt (`db push --dry-run` zur Kontrolle,
danach echter Push und direkte Nachweise gegen die echten Objekte, analog zum Vorgehen bei Phase A)
— bewusst noch nicht ausgeführt, braucht separate Freigabe. Der verwaiste
`learning_materials`-Bucket bleibt ebenfalls offen.

**Ende von Revision 2 — auf Abschluss der offenen Nachweise und Implementierungsfreigabe warten.**
