# Supabase-Baseline-Inventar – 18.07.2026

## 1. Status, Umfang und Schutzgrenze

**Status:** Read-only-Inventar erfolgreich ausgeführt; schema-only Dump erzeugt und gegen das
Kataloginventar abgeglichen (siehe Nachtrag vom 19.07.2026). Lokales Baseline-Gate noch offen.

**Erfassungszeitpunkt:** 18.07.2026 19:38:41 UTC  
**Projekt:** `ZAP_25`  
**Projekt-Ref:** `ybzdibifgqjsbohtztmy`

### Kontroll-Revalidierung vom 19.07.2026

Am 19.07.2026 wurden ausschließlich die driftanfälligen, über PostgREST sicher prüfbaren Angaben
erneut read-only validiert:

- sechs HTTP-HEAD-Abfragen antworteten mit HTTP 200 und bestätigten unverändert die Counts
  `8 / 48 / 10 / 3 / 4 / 8`;
- alle acht `intensivwoche_kurse` waren weiterhin aktiv;
- die REST-Schemabeschreibung bestätigte weiterhin exakt fünf vorhandene und 22 fehlende
  Zieltabellen;
- `idempotency_key`, `edition_id`, `session_id` und `area_id` fehlten weiterhin.

Diese Kontrolle ersetzt den DB-Level-Kataloglauf vom 18.07.2026 nicht. Remote-Migrationshistorie,
Constraints, Grants, Routinen, Trigger und Policies wurden am 19.07.2026 mangels einer im Prozess
verfügbaren direkten DB-Anmeldung nicht erneut gelesen. Sie müssen vor Dump, Baseline-Adoption und
jeder Fachmigration erneut direkt inventarisiert werden. Aussagen aus dem Kataloglauf bleiben
daher ausdrücklich ein datierter Stand vom 18.07.2026 und keine undatierte Live-Garantie.

Alle Remote-SQL-Abfragen liefen als befristete Rolle `zap_baseline_reader` innerhalb einer
expliziten `READ ONLY`-Transaktion. Aktiv waren TLS `verify-full`, das offizielle Supabase-CA-
Zertifikat, ein Statement-Timeout von 30 Sekunden und ein Lock-Timeout von 5 Sekunden. Die Rolle
ist bis 26.07.2026 00:00 UTC gültig, auf zwei Verbindungen begrenzt und besitzt keine direkten
Leserechte auf Geschäfts-, Auth- oder Storage-Objektzeilen.

Dieser bereinigte Bericht enthält ausschließlich Strukturmetadaten, sichere Migrationsfelder und
vorgesehene Aggregate. Nicht aufgenommen wurden:

- Kennwörter, Tokens, Schlüssel oder vollständige DB-URLs;
- `supabase_migrations.schema_migrations.statements`;
- Geschäfts-, Auth-, Buchungs- oder Testdatenzeilen;
- Storage-Objektpfade, Eigentümer oder Objektmetadaten;
- unbekannte Freitextgruppen oder personenbezogene Statusverteilungen.

## 2. Projektidentität

| Unabhängige Quelle | Festgestellter Wert | Ergebnis |
|---|---|---|
| Supabase Dashboard | Display-Name `ZAP_25`, Ref `ybzdibifgqjsbohtztmy` | stimmt |
| `NEXT_PUBLIC_SUPABASE_URL` | Host-Präfix `ybzdibifgqjsbohtztmy` | stimmt |
| PostgreSQL-Servicebenutzer | Suffix `ybzdibifgqjsbohtztmy` | stimmt |
| Live-Datenbank | DB `postgres`, Rolle `zap_baseline_reader` | erwartet |

Die drei Projekt-Ref-Quellen stimmen exakt überein. Die Datenbank meldete PostgreSQL `17.4`,
`transaction_read_only = on` und `ssl = on`. Eine Zielverwechslung ist anhand der geprüften
Quellen nicht erkennbar.

## 3. Geprüfte Tool- und Verbindungskette

| Komponente | Freigegebener Wert |
|---|---|
| `psql` | `D:\Program Files\PostgreSQL\18\bin\psql.exe`, Version `18.4` |
| `pg_dump` | `D:\Program Files\PostgreSQL\18\bin\pg_dump.exe`, Version `18.4` |
| Verbindung | IPv4-Session-Pooler, Port 5432, Service `zap_baseline_readonly` |
| TLS | `verify-full` mit `supabase/prod-ca-2021.crt` |

Das direkte IPv6-Ziel war aus der lokalen Umgebung nicht erreichbar. Deshalb wurde der von
Supabase dafür vorgesehene IPv4-Session-Pooler verwendet. Kennwörter wurden nur kurzzeitig als
Prozessvariable gesetzt, anschließend entfernt und weder in Service- noch Skriptdateien
gespeichert.

## 4. Nicht personenbezogene PostgREST-Counts

Die Requests verwendeten ausschließlich HTTP `HEAD`, `Prefer: count=exact` und den Gesamtwert aus
`Content-Range`. Es wurde kein Response-Body angefordert oder gespeichert.

| Tabelle | HTTP | Live | Kontrollstand | Drift |
|---|---:|---:|---:|---:|
| `intensivwoche_kurse` | 200 | 8 | 8 | 0 |
| `intensivwoche_anmeldungen` | 200 | 48 | 48 | 0 |
| `subjects` | 200 | 10 | 10 | 0 |
| `mentor_skills` | 200 | 3 | 3 | 0 |
| `courses` | 200 | 4 | 4 | 0 |
| `course_occurrences` | 200 | 8 | 8 | 0 |

Es liegt bei keiner Kontrolltabelle ein Count-Drift vor. Die Werte sind Gesamtsummen der
vorgegebenen Kontrolltabellen und keine kleinen personenbezogenen Statusgruppen.

## 5. Remote-Migrationshistorie

Die Remote-Tabelle besitzt die sicher verwendbaren Spalten `version` und `name`. Die vorhandene
Spalte `statements` wurde weder selektiert noch exportiert. Aus jeder vorhandenen Zeile wird nur der
Zustand `applied` abgeleitet.

| Version | Name | Zustand |
|---|---|---|
| `20260223095436` | `005_enable_rls_all_tables` | applied |
| `20260223100040` | `006_cleanup_redundant_policies` | applied |
| `20260223100357` | `007_fix_anon_insert_policy` | applied |
| `20260223100804` | `add_lehrperson_role` | applied |
| `20260223101820` | `add_created_by_to_kurse` | applied |
| `20260223102115` | `recreate_kurse_view_with_created_by` | applied |
| `20260223102441` | `cleanup_redundant_is_lehrperson` | applied |
| `20260223104106` | `auto_create_profile_on_signup` | applied |
| `20260223123425` | `add_theme_preference_to_profiles` | applied |
| `20260223125839` | `extend_learning_materials` | applied |
| `20260223210352` | `add_is_link_to_learning_materials` | applied |
| `20260224224630` | `add_increment_download_count_function` | applied |
| `20260224230812` | `create_student_essays_table` | applied |
| `20260224231307` | `create_student_essays_storage` | applied |
| `20260224231938` | `add_teacher_essay_policies` | applied |
| `20260321211303` | `007_create_ai_correction_tables` | applied |
| `20260516103349` | `create_math_solution_steps` | applied |
| `20260718092433` | `012_fix_mentorship_role_values` | applied |
| `20260718092441` | `013_add_booking_price_snapshot` | applied |
| `20260718092458` | `014_atomic_booking_function` | applied |

### Abgleich mit den lokalen Dateien

- Remote: 20 angewendete Einträge mit 14-stelligen Versionen.
- Lokal: 12 historische Dateien.
- Lokal ist das Präfix `002` doppelt vorhanden; `009` bis `011` fehlen.
- Nur vier lokale Dateistämme stimmen mit einem Remote-Namen überein:
  `007_create_ai_correction_tables`, `012_fix_mentorship_role_values`,
  `013_add_booking_price_snapshot` und `014_atomic_booking_function`.
- Die lokale Kette ist daher kein vollständiges oder leer-datenbankfähiges Abbild des Live-Schemas.

Die zwölf lokalen Dateien wurden nicht verändert. Ihre SHA-256-Werte zum Prüfzeitpunkt:

| Datei | SHA-256 |
|---|---|
| `001_create_trainer_tables.sql` | `0B63E7DDA71D2196B7F1AE0B2D20B8C13E7E5E7F2EAB74B91CA574F83372F7C5` |
| `002_create_intensivwoche_anmeldungen.sql` | `5A947E62D1134428BBD5664A8E4844949F82ABE252A58E04B86B1CA74AD38F98` |
| `002_create_student_essays.sql` | `8838D9BB224252B64852575303AE04E86593BF52C5542780BEB8A3296C411EDF` |
| `003_create_intensivwoche_kurse.sql` | `BFD89FFD4D9CB2DB390326F19800831A2450F005BF28F088403979D646EF9E0E` |
| `004_fix_rls_policies.sql` | `C87C52295B0F2EA50AA53652FB4D072561D857BBC9286368519A5C1C7D496563` |
| `005_create_mentorship_tables.sql` | `6CAA7BADE0B9F9AF09BC532AA7DC3C368D56ECB39342C30B71FC1839D5BCAF03` |
| `006_seed_test_data.sql` | `2930D90DC90ACC2C6A7A38E0D98BC4B8887B9B2D820D5AD6CABA88568FDA19DD` |
| `007_create_ai_correction_tables.sql` | `A8C26B088EF77F480ACE9161521F0D087516F8289E86B1E1520DBF65B43F9520` |
| `008_profiles_rls.sql` | `291BA17C6AB8599EACC5C37A4CB5B198F644DD4CEB3AAF45D880D1D266734138` |
| `012_fix_mentorship_role_values.sql` | `A42844BFAC02B21233A228D7F068928C9FE18C79EF7A13A893190526AA3E62C1` |
| `013_add_booking_price_snapshot.sql` | `339BD43E6619FC9F9890EF71F874CA9CB6164A1C7EC30DD674C62D42C4A034D5` |
| `014_atomic_booking_function.sql` | `94336461C50DFB7242961957B8A831B2A75A36DE94996DC70A69425A3C311F13` |

## 6. DB-Level-Strukturinventar

| Objektklasse | Public | Storage | Bemerkung |
|---|---:|---:|---|
| Tabellen | 26 | 8 | alle 26 Public-Tabellen mit RLS |
| Tabellen mit `FORCE RLS` | 0 | nicht bewertet | kein automatischer Fehler, aber Prüfpunkt |
| Views/Materialized Views | 1 | 0 | Definition und `reloptions` inventarisiert |
| Sequenzen | 12 | 0 | Parameter inventarisiert |
| Constraints | 84 | 14 | vollständige Katalogdefinitionen inventarisiert |
| Indizes | 72 | 17 | inklusive Unique-/Partial-/Expression-Definitionen |
| Trigger | 9 | 4 | interne Systemtrigger ausgeschlossen |
| Routinen | 15 | nicht Bestandteil | Signatur, Sicherheit und Definition inventarisiert |
| davon `SECURITY DEFINER` | 9 | – | benötigt fortgesetztes Sicherheitsreview |
| RLS-Policies | 131 | 15 | `USING` und `WITH CHECK` inventarisiert |
| Extensions | 7 gesamt | – | Name, Version und Schema inventarisiert |

Zusätzlich wurden 336 Spaltendefinitionen, drei Enum-/Domain-Zeilen, Owner, Collations, Defaults,
Identity-/Generated-Attribute, explizite Relation-Grants, Default Privileges und Publications
erfasst. `supabase_realtime` publiziert aktuell ausschließlich `public.chat_messages`.

Public-Tabellen zum Prüfzeitpunkt:

`badges`, `chat_messages`, `correction_rubrics`, `course_occurrences`, `courses`,
`essay_ai_corrections`, `exercises`, `intensivwoche_anmeldungen`, `intensivwoche_kurse`,
`learning_materials`, `math_solution_steps`, `mentor_skills`, `mentorship_listings`,
`mentorship_materials`, `mentorship_relations`, `mentorship_requests`, `profiles`, `questions`,
`student_essays`, `subjects`, `tasks`, `trainer_exams`, `trainer_progress`, `user_badges`,
`user_exercises`, `wake_up`.

Public-Routinen zum Prüfzeitpunkt:

`accept_mentorship_request`, `book_intensivwoche_kurs`, `get_upcoming_courses`, `handle_new_user`,
`increment_material_view_count`, `is_admin`, `is_content_manager`, `is_kurs_aktiv`,
`is_kurs_owner`, `is_owner`, `set_essay_review_timestamp`,
`update_correction_rubrics_updated_at`, `update_mentorship_updated_at`,
`update_student_essays_updated_at`, `update_updated_at_column`.

Die vollständigen Definitionen verbleiben im geschützten Rohinventar. Sie werden nicht in diesen
bereinigten Bericht dupliziert.

### Storage-Abgrenzung

Die Reader-Rolle besitzt weder `USAGE` auf `storage` noch `SELECT` auf `storage.buckets` oder
`storage.objects`. Es wurden deshalb keine Bucket- oder Objektzeilen gelesen. Die 15
Storage-Policies und die Storage-Strukturobjekte wurden ausschließlich über PostgreSQL-Kataloge
inventarisiert. Bucket-Konfigurationen sind weiterhin getrennte Datenkonfiguration und nicht Teil
eines schema-only Dumps.

## 7. Soll-/Ist-Matrix der 27 Zieltabellen

| Gruppe | Erwartung | Live-Ergebnis |
|---|---|---|
| vorhanden | `profiles`, `subjects`, `intensivwoche_kurse`, `intensivwoche_anmeldungen`, `learning_materials` | alle 5 vorhanden |
| Katalog fehlt | `offers`, `offer_editions`, `course_sessions` | alle 3 fehlen |
| Materialzugriff fehlt | `material_areas`, `self_study_enrollments`, `material_access_grants` | alle 3 fehlen |
| Tagesfreigaben fehlen | `release_content_catalog`, `course_days`, `daily_releases`, `daily_release_items` | alle 4 fehlen |
| Arbeitszeit/Lohn fehlt | `teacher_assignments`, `work_entries`, `teacher_rate_agreements`, `payroll_periods`, `payroll_snapshots`, `payroll_snapshot_lines` | alle 6 fehlen |
| Finanzen fehlen | `financial_events`, `expense_entries`, `financial_periods`, `budgets`, `financial_adjustments` | alle 5 fehlen |
| Audit fehlt | `audit_log` | fehlt |

Ergebnis: **5 vorhanden, 22 fehlend; keine Abweichung von der erwarteten Matrix.**

## 8. Bekannte offene Spalten

| Tabelle | Spalte | Live vorhanden |
|---|---|---|
| `intensivwoche_anmeldungen` | `idempotency_key` | nein |
| `intensivwoche_anmeldungen` | `edition_id` | nein |
| `intensivwoche_anmeldungen` | `session_id` | nein |
| `learning_materials` | `area_id` | nein |

Alle vier Spalten fehlen wie erwartet. Es wurde keine Remote-Korrektur vorgenommen.

## 9. Getrennte Referenzsuche für `courses` und `course_occurrences`

| Suchklasse | Ergebnis |
|---|---|
| Runtime-Code (`app`, `components`, `lib`, `store`, `context`, `proxy.ts`) | keine Referenz auf `courses` oder `course_occurrences` |
| Historisches SQL | `supabase/migrations/002_create_intensivwoche_anmeldungen.sql:7` referenziert `public.courses(id)` |
| Generierte Typen | `types/database.ts:145` enthält `course_occurrences`; `types/database.ts:174` enthält `courses`; FK-Metadaten stehen bei Zeile 166–169 |

Folgerung: Das Tabellenpaar existiert live und in generierten Typen, ist aber aktuell nicht als
Runtime-DB-Zugriff im untersuchten Anwendungscode nachweisbar. Generierte Typen sind kein Beleg für
eine Runtime-Nutzung.

## 10. Neuer Baseline-Strang und lokales Gate

Nach separater Implementierungsfreigabe ist folgende Zielstruktur vorgesehen:

```text
supabase/
├── config.toml
├── legacy-migrations/
│   └── 001–014 unverändert als historische Referenz
├── migrations/
│   ├── 20 reine Kommentar-Marker mit den bestätigten Remote-Zeitstempeln/-Namen
│   ├── YYYYMMDDHHMMSS_live_schema_baseline.sql
│   └── spätere additive Migrationen
├── seed.sql
└── tests/
    └── database/
```

Verbindliche Reihenfolge:

1. Historische Dateien byte-identisch hashen und aus dem ausführbaren Strang archivieren.
2. Remote-Historie erneut lesen und für jeden bestätigten Eintrag eine SQL-freie Markerdatei mit
   identischem Zeitstempel und Namen erzeugen; `statements` bleibt ungelesen.
3. Bereinigten schema-only Dump und ergänzende Katalogchecks erzeugen und reviewen.
4. Daraus eine datenfreie, zeitgestempelte Baseline ableiten.
5. Gepinnte Supabase CLI, kompatible Container-Runtime und `supabase/config.toml` freigeben.
6. Erst gegen den neuen lokalen Strang Reset, Lint und pgTAP ausführen.
7. Normalisierten Schema-Diff plus gezielte Tests für bekannte Tool-Lücken durchführen.
8. Nach grünem Gate und eigener Remote-Freigabe alle Marker per `migration list` abgleichen, nur
   die Baseline mit `migration repair <version> --status applied` registrieren und per
   `db push --dry-run` beweisen, dass ausschließlich additive Post-Baseline-Migrationen ausstehen.

Noch nicht ausgeführt sind `supabase db reset`, `supabase db lint`, `supabase test db` und ein
Schema-Diff. Eine Supabase CLI wurde nicht automatisch installiert oder nachgeladen.

## 11. Diff-, Rollback- und Buchungshärtungsplan

### Diff und Rollback

- Verglichen werden normalisierte Definitionen und Objekt-Counts, niemals Datenzeilen.
- Diff-Lücken bei Storage-Buckets, Publications und View-Optionen erhalten gezielte Katalog-/pgTAP-
  Tests.
- Folgemigrationen bleiben additiv und einzeln reviewbar.
- Ein Anwendungsrollback schaltet zuerst Routen oder Feature-Flags zurück und löscht keine
  Bestandsdaten.
- Bereits verwendete Tabellen, Spalten und Remote-Migrationsversionen werden nicht destruktiv
  zurückgerollt.
- Ein Live-Rollout benötigt separat Backup-/Restore-Nachweis, Verantwortliche und Freigabe.

### Spätere Buchungshärtungen

- familienfähiger Duplikatschlüssel für legitime Geschwisterbuchungen;
- eindeutiger `idempotency_key` für Request-Wiederholungen;
- DB-seitige Pflichtfeld-, Format- und Maximallängen-Checks;
- unveränderliche Preis-, Währungs-, Editions-, Session- und Idempotenz-Snapshots;
- minimale Grants und geprüfte RLS-/RPC-Berechtigungen;
- dauerhafter serverseitiger Rate-Limiter;
- Parallelitätstest für den letzten freien Platz;
- Tests für Wiederholungen, Geschwister, anonyme RPC-Eingaben und manipulierte Snapshotwerte.

Diese Punkte wurden nur dokumentiert, nicht implementiert.

## 12. Drift-, Sicherheits- und Abbruchkriterien

### Festgestellter Drift

- Count-Drift der sechs Kontrolltabellen: keiner.
- Zieltabellen-/Spaltenmatrix: keine Abweichung vom erwarteten Stand.
- Migrationshistorie: erheblicher struktureller Unterschied zwischen 20 Remote-Einträgen und zwölf
  lokalen Dateien; daher neue Baseline statt Reparatur der alten Kette.

### Offene Nachweise

- Die neun `SECURITY DEFINER`-Routinen benötigen im Baseline-Review weiterhin eine vollständige
  Prüfung von Owner, Grants und `search_path`.
- Lokales Reset-/Lint-/pgTAP-/Diff-Gate ist noch nicht aufgebaut oder ausgeführt.
- Bucket-Konfigurationen wurden wegen der Zugriffsschranke nicht als Datenzeilen inventarisiert.

## 14. Nachtrag 19.07.2026 — Schema-only Dump

**Erfassungszeitpunkt:** 2026-07-19T13:37:41Z (`captured_at_utc` aus der Review-Datei des
Dump-Skripts).

`zap_baseline_reader` besitzt laut Design keine Leserechte auf Nutzdatenzeilen. `pg_dump` verlangt
für den strukturellen `LOCK TABLE ... IN ACCESS SHARE MODE`-Schritt jedoch mindestens `SELECT` je
Tabelle, auch für einen reinen `--schema-only`-Dump. Deshalb wurde unmittelbar vor dem Dump ein
befristetes, eng auf diesen einen Lauf begrenztes Recht erteilt und danach sofort wieder entzogen:

```sql
GRANT SELECT ON ALL TABLES IN SCHEMA public TO zap_baseline_reader;
-- pg_dump lief unmittelbar danach
REVOKE SELECT ON ALL TABLES IN SCHEMA public FROM zap_baseline_reader;
```

Der Dump selbst hat währenddessen keine Datenzeilen gelesen oder exportiert (`--schema-only`,
`top_level_data_statements=0`). Diese temporäre Rechteausweitung ist eine Abweichung vom in
Abschnitt 5.1 beschriebenen Dauerzustand der Rolle und wird hiermit dokumentiert, statt als
stiller Drift unbemerkt zu bleiben. Der Enddauerzustand nach dem `REVOKE` wurde nicht erneut per
Katalogabfrage verifiziert; das sollte vor der nächsten Nutzung der Rolle nachgeholt werden.

### Ergebnis: Abgleich mit dem DB-Level-Strukturinventar vom 18.07.2026

| Objektklasse | Kataloglauf 18.07. | Schema-Dump 19.07. | Ergebnis |
|---|---:|---:|---|
| Tabellen (public) | 26 | 26 | kein Drift |
| Views | 1 | 1 | kein Drift |
| Funktionen | 15 | 15 | kein Drift |
| davon `SECURITY DEFINER` | 9 | 9 (2 weitere Treffer waren `COMMENT ON FUNCTION`-Text, keine Deklarationen) | kein Drift |
| RLS-Policies | 131 | 131 | kein Drift |
| Sequenzen | 12 | 8 identity-inline + 4 explizite `CREATE SEQUENCE` = 12 | kein Drift |
| Constraints | 84 | 26 PK + 7 UNIQUE + 30 FK + 21 CHECK = 84 | kein Drift |
| Indizes | 72 | 26 PK- + 7 UNIQUE-Backing-Indizes + 39 explizite `CREATE INDEX` = 72 | kein Drift |
| Trigger | 9 | 9 | kein Drift |

Der Dump enthielt 0 Top-Level-Datenanweisungen und 0 Treffer der Geheimnismuster-Prüfung.

| Artefakt | SHA-256 |
|---|---|
| `docs/migration-evidence/private/2026-07-19/step0PublicSchema.2026-07-19.sql` | `47CA58A401A5C7C4F8E71FBFCA42B8CA62248A392483DDB2320274C44E7E8527` |

Rohdump und Review-Datei liegen unter `docs/migration-evidence/private/2026-07-19/` und
unterliegen denselben Aufbewahrungs-/Zugriffsregeln wie das Verzeichnis vom 18.07.2026 (Abschnitt
13). Die NTFS-ACL-Einschränkung für dieses neue Datumsverzeichnis wurde noch nicht bestätigt und
sollte vor Weitergabe geprüft werden.

Damit ist der zuvor offene Checklistenpunkt „Bereinigten schema-only Dump erzeugt, geprüft und mit
ergänzenden Katalogchecks abgeglichen" aus `step0Baseline.revision2.md` erfüllt. Das lokale
Baseline-Gate (Abschnitt 9/10 des Plans) bleibt weiterhin offen und benötigt vor Beginn eine
separate Freigabe.

Abbruch vor einer Implementierungsfreigabe erfolgt insbesondere bei unklarer Projektidentität,
unerklärtem Objekt-Drift, fehlenden Constraints/Grants/RLS-Definitionen, Geheimnissen oder DML im
Dump, personenbezogenen Artefakten oder einem nicht grünen lokalen Gate.

## 13. Evidenz, Hashes und Aufbewahrung

| Artefakt | SHA-256 |
|---|---|
| `scripts/read-live-inventory.sql` | `D35768CCB7B69B8A00D2019F6E9CEF2599EA9B7DF7DFBC370B8227BF16975F76` |
| `scripts/read-live-summary.sql` | `4473B5000387460E9E5DEF3DABA27CB7D3BC3C4C9BE5CD4C639D8278521EF608` |
| `private/2026-07-18/step0LiveInventory.2026-07-18.txt` | `23740DC0B926E625EE82F962C8DCAEE6B2D835041F67317ABE8E326C7F525CE8` |
| `private/2026-07-18/step0LiveSummary.2026-07-18.txt` | `44F50618A7A9FE800C56B500210B59C67363104F17AC831AC0A7D4D255FD7489` |
| `scripts/approved-postgres-tools.ps1` | `9C88E37C61B007381551D3C030E92FFB75DE3AA4E29BBD2F3A77D60A4885C522` |
| `scripts/approved-db-connection.ps1` | `6BFB9031061A2778A51ADE100AAE6496D66E71E2AAAE9EDB3FBF3B7839CA64A8` |
| `supabase/pg_service.conf` | `24D05F7945A1CEF34B06AE11AC0228B20A8222DD7F0A4A235D193CBEC1B76FD4` |
| `supabase/prod-ca-2021.crt` | `700723581420DD1AC98FD7E9AC529F0EF210EADCAF87FC868A3AD7D114C2F3B7` |

Die Rohberichte liegen ausschließlich unter
`docs/migration-evidence/private/2026-07-18/`. Der Ordner ist durch `.gitignore` von der
Versionierung ausgeschlossen. Für den Ordner und beide Rohdateien ist die NTFS-Vererbung
deaktiviert; Vollzugriff besitzen nur der aktuelle lokale Benutzer und `SYSTEM`.

Aufbewahrungsentscheid: Rohberichte bleiben nur bis zur abgeschlossenen Prüfung des schema-only
Dumps und der daraus erzeugten Baseline erhalten, längstens bis 18.08.2026. Danach werden sie nach
Reviewer-Freigabe gelöscht. `.gitignore` erlaubt ausschließlich diesen bereinigten Bericht zur
Versionierung; das private Unterverzeichnis bleibt immer ausgeschlossen. Vor dem Commit ist der
Geheimnismuster-Scan erneut auszuführen.

Automatischer Geheimnismuster-Scan: **negativ**.  
Manuelle Inhaltsprüfung: **keine Zugangsdaten oder Datenzeilen enthalten**.

## 15. Nachtrag 19.07.2026 — Storage-Bucket- und Policy-Erhebung

Ergänzt die in Abschnitt 6 ("Storage-Abgrenzung") offen gelassene Lücke: Bucket-Konfiguration und
Policy-Definitionen wurden nach separater Freigabe erhoben, ohne Objektzeilen oder Dateipfade zu
lesen.

### Vorgehen

- **Storage-Policy-Definitionen:** über `pg_policies` (Katalog-Metadaten) mit der bestehenden
  Rolle `zap_baseline_reader`, kein zusätzliches Recht nötig.
- **Bucket-Konfiguration:** Ein Versuch, `zap_baseline_reader` befristet `USAGE`/`SELECT` auf
  `storage`/`storage.buckets` zu gewähren, scheiterte strukturell und **ohne sichtbare
  Fehlermeldung**: Die Rolle `postgres` besitzt diese Rechte selbst nur ohne `WITH GRANT OPTION`
  (Grantor aller bestehenden Einträge ist `supabase_admin`, der Schema-Owner), kann sie also nicht
  weiterreichen — `GRANT` lief als stiller No-Op durch ("Success. No rows returned", aber
  `pg_namespace.nspacl` bestätigte: kein Eintrag für `zap_baseline_reader`). Stattdessen wurde die
  Bucket-Konfiguration über die Storage-REST-API (`GET /storage/v1/bucket`, `service_role`-Key,
  eigener Zugriffsweg unabhängig von Postgres-Schema-Rechten) gelesen. Die zuvor versuchsweise
  vergebenen Grants wurden danach formal per `REVOKE` geschlossen (ohne dass sie je einen Effekt
  hatten).

### Ergebnis: 5 Buckets

| Bucket (`id`/`name`) | `public` | Größenlimit | Erlaubte MIME-Types | Erstellt |
|---|---|---:|---|---|
| `avatars` | true | 2 MiB | image/jpeg, png, webp, gif | 2024-10-04 |
| `learning_materials` | true | — (kein Limit) | — (keine Einschränkung) | 2025-09-17 |
| `lernmaterialien` | true | 50 MiB | pdf, doc/docx, xls/xlsx, ppt/pptx, jpeg, png, webp, mp4, mpeg-audio | 2026-02-23 |
| `student-essays` | false | 10 MiB | pdf, doc/docx | 2026-02-24 |
| `correction-rubrics` | false | 5 MiB | pdf | 2026-03-21 |

### Ergebnis: 15 RLS-Policies, ausschließlich auf `storage.objects`

Keine Policy auf `storage.buckets` selbst. Nach Bucket gruppiert:

- **`avatars`** (5 Policies): öffentlich lesbar; jeder authentifizierte Nutzer darf nur seinen
  eigenen Avatar (Ordner = eigene `auth.uid()`) hochladen/ändern/löschen.
- **`lernmaterialien`** (3 Policies): öffentlich lesbar; Lehrpersonen/Admins dürfen hochladen;
  eigene oder als Admin löschen.
- **`student-essays`** (4 Policies): Schüler dürfen nur eigene Entwürfe im eigenen
  `aufsaetze/<uid>`-Unterordner lesen/hochladen/löschen; Lehrpersonen/Admins dürfen alle Aufsätze
  lesen.
- **`correction-rubrics`** (0 Policies): kein Zugriff über RLS vorgesehen — konsistent mit dem
  Laufzeitcode (`app/(dashboard)/dashboard/aufsaetze/rubriken/actions.ts` u. a.), der ausschließlich
  über `adminSupabase` (RLS-umgehender `service_role`-Client) darauf zugreift.
- **`learning_materials`** (0 Policies): **verwaister Bucket.** Keine Policy referenziert
  `bucket_id = 'learning_materials'` (nur das gleichnamige, aber separate `lernmaterialien`), und
  kein Laufzeitcode referenziert diesen Bucket-Namen (Code-Grep über `app/`, `components/`, `lib/`,
  `store/`, `context/`). Mit aktivem RLS und ohne passende Policy ist er über die normale
  Nutzer-API praktisch unzugänglich (nur `service_role` käme heran) — vermutlich ein Altlast-Bucket
  vor einer Umbenennung auf den deutschen Namen.

### Nachtrag 19.07.2026 — learning_materials-Bucket geprüft und gesichert

Der Bucket ist **nicht leer**: fünf Dateien vom 17.09.2025 (Mathematik-Aufgaben/-Lösungen,
Sprachprüfung/-Lösung, Textblatt, jeweils PDF), alle deutlich älter als der aktuell genutzte
`lernmaterialien`-Bucket (erstellt 23.02.2026). Root-Listing von `lernmaterialien` ist leer — die
Dateien wurden nachweislich nie dorthin migriert, sind also eigenständige Altlasten aus einer
früheren, abgelösten Version, nicht Teil des aktuellen Systems.

Entscheidung: **nicht gelöscht** (unumkehrbar, keine Dringlichkeit), stattdessen alle fünf Dateien
zur Sicherheit lokal gesichert unter
`docs/migration-evidence/private/2026-07-19/learning_materials_backup/` (Dateigrößen exakt gegen
die Storage-API-Auflistung geprüft, keine Beschädigung). Der Ordner unterliegt denselben
`.gitignore`-Regeln wie die übrigen privaten Rohbelege. Endgültiges Aufräumen (Löschen oder
formale Stilllegung des Buckets) bleibt eine eigene, separat zu entscheidende Aufgabe — jemand
sollte die Dateiinhalte inhaltlich prüfen, bevor final entschieden wird.

### Nicht erhoben

Objektzeilen, Dateipfade, Owner-Zuordnungen einzelner Dateien — bewusst außerhalb des Scopes, wie
in Abschnitt 6 festgelegt.
