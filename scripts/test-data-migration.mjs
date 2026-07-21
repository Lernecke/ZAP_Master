#!/usr/bin/env node
// Sentinel-Datenmigrationstest (Abschnitt 10.1/10.2 des Architektur-Briefings).
//
// Stellt zuerst den Schema-Zustand unmittelbar VOR der zuletzt hinzugefuegten Migration her,
// fuegt einen Sentinel-Kurs samt Anmeldung ein, wendet danach NUR diese eine neue Migration an
// und vergleicht IDs/FKs/Status/Counts. Beweist, dass die neueste additive Migration bestehende
// intensivwoche_kurse-/intensivwoche_anmeldungen-Zeilen nicht verliert oder umnummeriert
// (Abschnitt 2.10: IDs/FKs sind Geschaeftsreferenzen und werden nie neu vergeben).
//
// Nutzt `supabase db reset --local --last 1` (laesst genau die neueste Migrationsdatei aus) statt
// physisch Dateien zu verschieben -- robuster, da kein Dateisystem-Zustand ueberlebt, falls das
// Skript abstuerzt. Endet in jedem Fall (Erfolg wie Fehlschlag) mit einem vollstaendigen
// `db reset --local` + E2E-Nutzer-Seed, damit die lokale Instanz fuer nachfolgende Gate-Schritte
// (build:test, Playwright) in kanonischem Zustand ist.

import { createClient } from '@supabase/supabase-js'
import { readdirSync } from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { runSupabaseCli, getLocalSupabaseStatus, projectRoot } from './lib/local-supabase.mjs'

const migrationsDir = path.join(projectRoot, 'supabase', 'migrations')
const migrationFiles = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort()
const latestMigration = migrationFiles.at(-1)

if (!latestMigration) {
  console.error('Abbruch: keine Migrationsdateien unter supabase/migrations gefunden.')
  process.exit(1)
}

console.log(`Sentinel-Test fuer die neueste Migration: ${latestMigration}`)

function finalizeLocalDb() {
  console.log('\nStelle vollstaendigen, kanonischen lokalen DB-Zustand wieder her ...')
  // db-reset-local.mjs kombiniert bereits db reset + E2E-Nutzer- + E2E-Kursfixture-Seed
  // (dieselbe Reihenfolge wie Schritt 3 des Gates) -- keine doppelte Logik hier.
  const reset = spawnSync('node', [path.join(projectRoot, 'scripts', 'db-reset-local.mjs')], {
    cwd: projectRoot,
    stdio: 'inherit',
  })
  if (reset.status !== 0) {
    console.error('Warnung: finaler db-reset-local.mjs-Lauf ist fehlgeschlagen.')
  }
}

function fail(message) {
  console.error(`\nFEHLGESCHLAGEN: ${message}`)
  finalizeLocalDb()
  process.exit(1)
}

// 1) Zustand unmittelbar vor der neuesten Migration herstellen (ohne Marketing-/Demo-Seed --
//    wir brauchen fuer diesen Test nur das reine Schema).
runSupabaseCli(['db', 'reset', '--local', '--last', '1', '--no-seed'])

const status = getLocalSupabaseStatus()
const admin = createClient(status.API_URL, status.SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// 2) Sentinel-Kurs + -Anmeldung einfuegen und alle Vorher-Werte einfrieren.
const sentinelKurs = {
  name: 'Sentinel Migrationstest-Kurs',
  beschreibung: 'Automatisch erzeugt von scripts/test-data-migration.mjs',
  fach: 'mathematik',
  klassenstufen: ['6. Klasse'],
  start_datum: '2027-01-04',
  end_datum: '2027-01-08',
  uhrzeit: '09:00-12:00',
  lehrer: 'Sentinel Lehrperson',
  preis: 123.45,
  max_teilnehmer: 10,
  ort: 'Zürich HB',
  ist_aktiv: true,
}

const { data: kursBefore, error: kursInsertError } = await admin
  .from('intensivwoche_kurse')
  .insert(sentinelKurs)
  .select('*')
  .single()

if (kursInsertError || !kursBefore) {
  fail(`Sentinel-Kurs konnte vor der Migration nicht angelegt werden: ${kursInsertError?.message}`)
}

const sentinelAnmeldung = {
  kurs_id: kursBefore.id,
  parent_email: 'sentinel-migration-test@example.test',
  parent_phone: '0041000000000',
  child_firstname: 'Sentinelli',
  child_lastname: 'Testperson',
  child_gender: 'd',
  child_class_level: '6. Klasse',
  status: 'bestaetigt',
}

const { data: anmeldungBefore, error: anmeldungInsertError } = await admin
  .from('intensivwoche_anmeldungen')
  .insert(sentinelAnmeldung)
  .select('*')
  .single()

if (anmeldungInsertError || !anmeldungBefore) {
  fail(`Sentinel-Anmeldung konnte vor der Migration nicht angelegt werden: ${anmeldungInsertError?.message}`)
}

const { count: kursCountBefore } = await admin.from('intensivwoche_kurse').select('*', { count: 'exact', head: true })
const { count: anmeldungCountBefore } = await admin.from('intensivwoche_anmeldungen').select('*', { count: 'exact', head: true })

console.log(`Sentinel-Kurs id=${kursBefore.id}, Sentinel-Anmeldung id=${anmeldungBefore.id} vor Migration angelegt.`)
console.log(`Counts vor Migration: intensivwoche_kurse=${kursCountBefore}, intensivwoche_anmeldungen=${anmeldungCountBefore}`)

// 3) Nur die neueste Migration anwenden -- KEIN erneuter `db reset`, sonst wuerden die Sentinel-
//    Zeilen wieder verworfen statt durch die Migration hindurch erhalten zu bleiben.
console.log(`\nWende ${latestMigration} auf den bestehenden Zustand an ...`)
runSupabaseCli(['migration', 'up', '--local'])

// 4) Nachher-Zustand pruefen.
const { data: kursAfter, error: kursAfterError } = await admin
  .from('intensivwoche_kurse')
  .select('*')
  .eq('id', kursBefore.id)
  .maybeSingle()

if (kursAfterError || !kursAfter) {
  fail(`Sentinel-Kurs (id=${kursBefore.id}) ist nach der Migration nicht mehr auffindbar: ${kursAfterError?.message}`)
}

const { data: anmeldungAfter, error: anmeldungAfterError } = await admin
  .from('intensivwoche_anmeldungen')
  .select('*')
  .eq('id', anmeldungBefore.id)
  .maybeSingle()

if (anmeldungAfterError || !anmeldungAfter) {
  fail(`Sentinel-Anmeldung (id=${anmeldungBefore.id}) ist nach der Migration nicht mehr auffindbar: ${anmeldungAfterError?.message}`)
}

if (anmeldungAfter.kurs_id !== kursBefore.id) {
  fail(`Sentinel-Anmeldung.kurs_id hat sich veraendert: vorher ${kursBefore.id}, nachher ${anmeldungAfter.kurs_id}.`)
}

if (anmeldungAfter.status !== sentinelAnmeldung.status) {
  fail(`Sentinel-Anmeldung.status hat sich veraendert: vorher "${sentinelAnmeldung.status}", nachher "${anmeldungAfter.status}".`)
}

if (Number(kursAfter.preis) !== Number(kursBefore.preis)) {
  fail(`Sentinel-Kurs.preis hat sich veraendert: vorher ${kursBefore.preis}, nachher ${kursAfter.preis}.`)
}

const { count: kursCountAfter } = await admin.from('intensivwoche_kurse').select('*', { count: 'exact', head: true })
const { count: anmeldungCountAfter } = await admin.from('intensivwoche_anmeldungen').select('*', { count: 'exact', head: true })

if (kursCountAfter !== kursCountBefore) {
  fail(`Anzahl intensivwoche_kurse hat sich veraendert: vorher ${kursCountBefore}, nachher ${kursCountAfter} (Migration darf nur additiv sein).`)
}

if (anmeldungCountAfter !== anmeldungCountBefore) {
  fail(`Anzahl intensivwoche_anmeldungen hat sich veraendert: vorher ${anmeldungCountBefore}, nachher ${anmeldungCountAfter} (Migration darf nur additiv sein).`)
}

console.log(`Counts nach Migration unveraendert: intensivwoche_kurse=${kursCountAfter}, intensivwoche_anmeldungen=${anmeldungCountAfter}`)
console.log(`ID, FK, Status und Preis von Sentinel-Kurs/-Anmeldung sind nach ${latestMigration} unveraendert.`)
console.log('\nBESTANDEN: Sentinel-Datenmigrationstest.')

finalizeLocalDb()
