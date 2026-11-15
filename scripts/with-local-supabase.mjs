#!/usr/bin/env node
// Local-only Supabase Env-Wrapper (Abschnitt 10.1 des Architektur-Briefings).
//
// .env/.env.local zeigen NEXT_PUBLIC_SUPABASE_URL bewusst auf das LIVE-Projekt (siehe CLAUDE.md
// "Datenbank-Workflow") -- fuer build:test/start:test/Playwright darf dieser Wert niemals
// durchschlagen. Dieses Skript liest die lokal laufende, gepinnte Supabase-Instanz aus und
// startet den uebergebenen Kindprozess mit explizit ueberschriebenen lokalen Supabase-Env-Werten.
// Next.js/@next/env ueberschreiben bereits gesetzte process.env-Werte nicht mit .env-Dateiinhalten
// -- die hier gesetzten Werte gewinnen deshalb zuverlaessig.
//
// Nutzung: node scripts/with-local-supabase.mjs <command> [args...]
// Beispiel: node scripts/with-local-supabase.mjs next build

import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { getLocalSupabaseStatus, assertLoopback, projectRoot } from './lib/local-supabase.mjs'

const status = getLocalSupabaseStatus()

const childEnv = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: status.ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
}

// Verteidigung in der Tiefe: auch den tatsaechlich an den Kindprozess uebergebenen Wert pruefen,
// nicht nur den direkt von der CLI gelesenen.
assertLoopback(childEnv.NEXT_PUBLIC_SUPABASE_URL, 'aufgelöste NEXT_PUBLIC_SUPABASE_URL für den Kindprozess')

const [command, ...args] = process.argv.slice(2)
if (!command) {
  console.error('Nutzung: node scripts/with-local-supabase.mjs <command> [args...]')
  process.exit(1)
}

const LOCAL_BIN_SCRIPTS = {
  next: path.join(projectRoot, 'node_modules', 'next', 'dist', 'bin', 'next'),
  playwright: path.join(projectRoot, 'node_modules', '@playwright', 'test', 'cli.js'),
}

let execCommand = command
let execArgs = args
if (Object.hasOwn(LOCAL_BIN_SCRIPTS, command) && existsSync(LOCAL_BIN_SCRIPTS[command])) {
  execCommand = process.execPath
  execArgs = [LOCAL_BIN_SCRIPTS[command], ...args]
} else if (command === 'node') {
  execCommand = process.execPath
}

const child = spawnSync(execCommand, execArgs, {
  cwd: projectRoot,
  env: childEnv,
  stdio: 'inherit',
  shell: false,
})

if (child.error) {
  console.error(child.error)
  process.exit(1)
}
process.exit(child.status ?? 1)
