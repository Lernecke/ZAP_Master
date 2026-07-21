#!/usr/bin/env node
// Kombiniert `supabase db reset --local` mit dem anschliessenden Anlegen der beiden
// E2E-Testnutzer (Abschnitt 10.1) -- ein `db reset` leert auth.users vollstaendig, daher muss die
// Seed-Reihenfolge immer "reset, dann e2e-Nutzer anlegen" sein, nie umgekehrt.
//
// Nutzung: node scripts/db-reset-local.mjs [-- <zusaetzliche supabase-db-reset-flags>]

import { runSupabaseCli } from './lib/local-supabase.mjs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { projectRoot } from './lib/local-supabase.mjs'

const extraFlags = process.argv.slice(2)

runSupabaseCli(['db', 'reset', '--local', ...extraFlags])

const seed = spawnSync('node', [path.join(projectRoot, 'scripts', 'seed-e2e-users.mjs')], {
  cwd: projectRoot,
  stdio: 'inherit',
})

process.exit(seed.status ?? 1)
