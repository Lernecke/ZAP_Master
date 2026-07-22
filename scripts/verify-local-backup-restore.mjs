#!/usr/bin/env node
// Restore-Nachweis fuer den Staging-/Backup-Punkt aus Abschnitt 10.4 ("Struktur- und Datenbackup
// ... mit dokumentiertem Wiederherstellungstest"). Beweist NUR die Restore-Mechanik gegen die
// bereits laufende lokale Supabase-Instanz (Docker) -- niemals gegen das Live-Projekt. Ein
// tatsaechlicher Backup von Live erfordert das Live-DB-Passwort, das laut CLAUDE.md
// ("Datenbank-Workflow") nie vom Assistenten gehandhabt werden darf; dafuer ist
// scripts/backup-live-database.ps1 ein vom Menschen selbst auszufuehrendes Skript, siehe
// staging-backup-restore-runbook.md.
//
// Ablauf, bewusst NICHT "ganze Instanz per pg_dump/createdb/pg_restore klonen" (erster Versuch,
// scheiterte an Supabase-Plattform-internen Schemas wie vault/realtime, die eine Rechte-/
// Extension-Umgebung voraussetzen, die ein blankes `createdb` nicht hat -- z.B. "permission denied
// for table secrets" beim Wiederherstellen von vault.secrets). Realistischeres Modell fuer ein
// Supabase-Projekt: Schema kommt aus den Migrationen (bereits in jedem einzelnen Gate-Lauf dieses
// Projekts bewiesen reproduzierbar), "Backup" bedeutet die DATEN im public-Schema. Deshalb:
// 1) Datenexport (nur public-Schema, --data-only) der laufenden Instanz.
// 2) `supabase db reset --local --no-seed`: dieselbe Instanz bekommt ein frisches, aus den
//    Migrationen aufgebautes Schema OHNE die synthetischen Seed-Fixtures (die wuerden mit den
//    gleich restaurierten Daten kollidieren).
// 3) Restore der Daten aus (1) in dieses frische Schema.
// 4) Abgleich Tabellenanzahl/Zeilenzahl gegen die vor Schritt 2 eingefrorenen Referenzwerte.
// 5) Abschliessend `supabase db reset --local` (MIT Seed) -- die Instanz bleibt fuer nachfolgende
//    Arbeit im gewohnten kanonischen Zustand, unabhaengig vom Testergebnis.
// Nutzt dieselbe PostgreSQL-18-Installation wie die in scripts/approved-postgres-tools.ps1 fuer den
// Live-Kontext gepinnten Werkzeuge, aber ohne deren Hash-Pinning-Zeremonie -- die ist dort speziell
// fuer den Live-Kontext gedacht; dieses Skript beruehrt ausschliesslich 127.0.0.1.
//
// Nutzung: node scripts/verify-local-backup-restore.mjs

import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { getLocalSupabaseStatus, runSupabaseCli } from './lib/local-supabase.mjs'

const PG_BIN_DIR = String.raw`D:\Program Files\PostgreSQL\18\bin`
const PG_DUMP = path.join(PG_BIN_DIR, 'pg_dump.exe')
const PSQL = path.join(PG_BIN_DIR, 'psql.exe')

for (const tool of [PG_DUMP, PSQL]) {
  if (!existsSync(tool)) {
    console.error(`Abbruch: PostgreSQL-Werkzeug nicht gefunden unter ${tool}.`)
    process.exit(1)
  }
}

function connectionOf(status) {
  const dbUrl = new URL(status.DB_URL)
  // assertLoopback() aus lib/local-supabase.mjs prueft nur http(s)://-URLs (API_URL) -- DB_URL
  // nutzt das postgresql://-Schema, deshalb hier ein eigener, gleichwertiger Loopback-Zwang.
  if (dbUrl.hostname !== '127.0.0.1' && dbUrl.hostname !== 'localhost') {
    console.error(`Abbruch: DB_URL ("${status.DB_URL}") ist keine lokale Loopback-Adresse. Dieses Skript darf nur gegen die lokale Supabase-Instanz laufen.`)
    process.exit(1)
  }
  return {
    host: dbUrl.hostname,
    port: dbUrl.port,
    user: dbUrl.username,
    database: dbUrl.pathname.replace(/^\//, ''),
    env: { ...process.env, PGPASSWORD: dbUrl.password },
  }
}

function run(command, args, env, label) {
  console.log(`\n$ ${path.basename(command)} ${args.join(' ')}`)
  const result = spawnSync(command, args, { env, encoding: 'utf-8' })
  if (result.status !== 0) {
    console.error(result.stdout)
    console.error(result.stderr)
    throw new Error(`${label} fehlgeschlagen (Exit-Code ${result.status}).`)
  }
  if (result.stdout?.trim()) console.log(result.stdout.trim())
  return result
}

function queryCount(conn, sql) {
  const result = spawnSync(
    PSQL,
    ['-h', conn.host, '-p', conn.port, '-U', conn.user, '-d', conn.database, '-t', '-A', '-c', sql],
    { env: conn.env, encoding: 'utf-8' }
  )
  if (result.status !== 0) {
    throw new Error(`Abfrage gegen ${conn.database} fehlgeschlagen: ${result.stderr}`)
  }
  return result.stdout.trim()
}

const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'zap-backup-restore-'))
const dumpFile = path.join(tmpDir, 'public-schema-data.sql')

try {
  const before = connectionOf(getLocalSupabaseStatus())
  console.log(`Instanz: ${before.host}:${before.port}/${before.database}`)
  console.log(`Datenexport (temporaer, wird am Ende geloescht): ${dumpFile}`)

  // 1) Reiner Datenexport der tatsaechlich dynamischen, nutzergenerierten Tabellen (Registrierung,
  //    Kursverwaltung, Buchung, Mail-Outbox) -- bewusst NICHT das gesamte public-Schema. Tabellen
  //    wie offers/offer_editions enthalten Referenz-/Katalogdaten, die bereits per Migration
  //    (20260721074103_seed_offer_catalog.sql) angelegt werden; ein Restore dieser Zeilen in ein
  //    frisch migriertes Schema kollidiert mit den bereits vorhandenen (empirisch belegt:
  //    "duplicate key value violates unique constraint offers_pkey"). Genau diese Trennung
  //    -- Schema/Referenzdaten aus Migrationen, Nutzdaten aus dem Backup -- ist das realistische
  //    Restore-Modell fuer dieses Projekt, nicht ein Implementierungsdetail dieses Tests.
  //    KEIN --disable-triggers: erfordert Rechte, die die lokale Supabase-"postgres"-Rolle fuer
  //    System-FK-Trigger nicht hat ("permission denied: ... is a system trigger", empirisch
  //    belegt). pg_dump ordnet Datenabschnitte ohnehin automatisch nach FK-Abhaengigkeit.
  // mail_outbox bewusst NICHT im Dump: es wird automatisch per Trigger aus
  // intensivwoche_anmeldungen abgeleitet (20260722092503_mail_outbox_schema.sql) -- ein
  // zusaetzlicher Restore der urspruenglichen Zeilen wuerde denselben Unique-Konflikt erzeugen wie
  // offers oben, nur trigger- statt migrationsgetrieben. Wird unten separat als abgeleitete Groesse
  // geprueft, nicht als exakter Zeilenabgleich.
  const dynamicTables = ['profiles', 'intensivwoche_kurse', 'intensivwoche_anmeldungen']
  run(
    PG_DUMP,
    ['-h', before.host, '-p', before.port, '-U', before.user, '-d', before.database,
     ...dynamicTables.flatMap((t) => ['--table', `public.${t}`]),
     '--data-only', '--no-owner', '--no-acl', '-f', dumpFile],
    before.env,
    'pg_dump'
  )

  const referenceCounts = {
    profiles: queryCount(before, 'select count(*) from public.profiles'),
    kurse: queryCount(before, 'select count(*) from public.intensivwoche_kurse'),
    anmeldungen: queryCount(before, 'select count(*) from public.intensivwoche_anmeldungen'),
  }

  // 2) Dieselbe Instanz auf ein frisches, ausschliesslich aus den Migrationen aufgebautes Schema
  //    zuruecksetzen -- OHNE die synthetischen Seed-Fixtures, die sonst mit den in Schritt 3
  //    restaurierten Zeilen kollidieren wuerden (Primary-Key-Konflikte bei z. B. subjects/offers).
  console.log('\n$ supabase db reset --local --no-seed')
  runSupabaseCli(['db', 'reset', '--local', '--no-seed'])

  // 3) Datenexport aus (1) in das frische Schema einspielen.
  const after = connectionOf(getLocalSupabaseStatus())
  run(PSQL, ['-h', after.host, '-p', after.port, '-U', after.user, '-d', after.database,
             '--set=ON_ERROR_STOP=1', '-f', dumpFile], after.env, 'psql (Restore)')

  // 4) Abgleich gegen die vor Schritt 2 eingefrorenen Referenzwerte.
  const restoredCounts = {
    profiles: queryCount(after, 'select count(*) from public.profiles'),
    kurse: queryCount(after, 'select count(*) from public.intensivwoche_kurse'),
    anmeldungen: queryCount(after, 'select count(*) from public.intensivwoche_anmeldungen'),
  }
  // mail_outbox wird NICHT restauriert (siehe Kommentar oben), sondern vom Enqueue-Trigger beim
  // Wiedereinspielen von intensivwoche_anmeldungen automatisch neu erzeugt -- geprueft als
  // abgeleitete Groesse: mindestens eine Zeile pro restaurierter Anmeldung.
  const restoredMailOutbox = queryCount(after, 'select count(*) from public.mail_outbox')

  console.log(`\nVor dem Reset:  ${referenceCounts.profiles} profiles, ${referenceCounts.kurse} intensivwoche_kurse, ${referenceCounts.anmeldungen} intensivwoche_anmeldungen`)
  console.log(`Nach Restore:   ${restoredCounts.profiles} profiles, ${restoredCounts.kurse} intensivwoche_kurse, ${restoredCounts.anmeldungen} intensivwoche_anmeldungen`)
  console.log(`mail_outbox nach Restore (vom Trigger abgeleitet, nicht direkt restauriert): ${restoredMailOutbox}`)

  const mismatch = Object.keys(referenceCounts).find((key) => referenceCounts[key] !== restoredCounts[key])
  if (mismatch) {
    throw new Error(`Abgleich fehlgeschlagen bei "${mismatch}": ${referenceCounts[mismatch]} vor dem Reset, ${restoredCounts[mismatch]} nach dem Restore.`)
  }
  if (Number(restoredMailOutbox) < Number(restoredCounts.anmeldungen)) {
    throw new Error(`mail_outbox hat nach dem Restore weniger Zeilen (${restoredMailOutbox}) als restaurierte Anmeldungen (${restoredCounts.anmeldungen}) -- der Enqueue-Trigger hat nicht fuer jede Zeile ausgeloest.`)
  }

  console.log('\nBESTANDEN: Ein Datenexport der dynamischen Tabellen der laufenden Instanz liess sich vollstaendig in ein frisch aus den Migrationen aufgebautes Schema restaurieren; abgeleitete Daten (mail_outbox) wurden korrekt vom Trigger nachgebildet.')
} finally {
  rmSync(tmpDir, { recursive: true, force: true })
  // 5) Instanz unabhaengig vom Testergebnis in den gewohnten kanonischen Zustand zurueckversetzen
  //    (MIT synthetischem Seed) -- nachfolgende Arbeit in dieser Session soll sich darauf verlassen
  //    koennen, wie jeder andere Schritt in diesem Projekt, der `supabase db reset --local` aufruft.
  console.log('\n$ supabase db reset --local (kanonischen Zustand wiederherstellen)')
  runSupabaseCli(['db', 'reset', '--local'], { allowFailure: true })
}
