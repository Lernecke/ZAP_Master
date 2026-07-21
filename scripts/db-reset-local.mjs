#!/usr/bin/env node
// Kombiniert `supabase db reset --local` mit dem anschliessenden Anlegen der E2E-Testnutzer und
// E2E-Kursfixtures (Abschnitt 10.1) -- ein `db reset` leert auth.users/intensivwoche_kurse
// vollstaendig, daher muss die Reihenfolge immer "reset, dann seeden" sein, nie umgekehrt. Die
// Kursfixtures muessen ausserdem VOR `npm run build:test` existieren (siehe Kommentar in
// seed-e2e-course-fixtures.mjs), weshalb dieses Skript sie direkt nach dem Reset anlegt.
//
// Nutzung: node scripts/db-reset-local.mjs [-- <zusaetzliche supabase-db-reset-flags>]

import { runSupabaseCli, projectRoot } from './lib/local-supabase.mjs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

const extraFlags = process.argv.slice(2)

runSupabaseCli(['db', 'reset', '--local', ...extraFlags])

function runSeedScript(name) {
  const result = spawnSync('node', [path.join(projectRoot, 'scripts', name)], {
    cwd: projectRoot,
    stdio: 'inherit',
  })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

runSeedScript('seed-e2e-users.mjs')
runSeedScript('seed-e2e-course-fixtures.mjs')
