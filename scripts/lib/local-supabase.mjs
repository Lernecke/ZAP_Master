// Gemeinsame Helper fuer alle lokalen Test-/Gate-Skripte (Abschnitt 10.1 des
// Architektur-Briefings). Buendelt die CLI-Pin-Pruefung aus scripts/approved-supabase-cli.ps1
// als Node-Aequivalent (die PS1-Datei wird hier bewusst nicht per Shell-Aufruf nachgenutzt, um
// diese Skripte auch aus einer reinen Node-Toolchain heraus lauffaehig zu halten) sowie den
// Loopback-Zwang: keines dieser Skripte darf jemals gegen eine entfernte Supabase-URL laufen.

import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const projectRoot = path.resolve(__dirname, '..', '..')

// Muss exakt scripts/approved-supabase-cli.ps1 entsprechen (Pfad + Hash). Bei einer bewussten
// CLI-Aktualisierung werden beide Stellen gemeinsam geprueft/aktualisiert.
export const supabaseExePath = path.join(projectRoot, 'tools', 'supabase-cli', 'supabase.exe')
const EXPECTED_SHA256 = '22C0F28F013411C7A7B880116CD33636EDB955A64278914692EEA010BCC98DC7'

export function getSupabaseCommand() {
  if (existsSync(supabaseExePath)) {
    const actualHash = createHash('sha256').update(readFileSync(supabaseExePath)).digest('hex').toUpperCase()
    if (actualHash !== EXPECTED_SHA256) {
      console.error(
        `Abbruch: SHA-256 der Supabase-CLI stimmt nicht mit dem freigegebenen Wert ueberein.\n  erwartet: ${EXPECTED_SHA256}\n  erhalten: ${actualHash}\nNiemals eine nicht geprüfte CLI verwenden -- siehe scripts/approved-supabase-cli.ps1.`
      )
      process.exit(1)
    }
    return supabaseExePath
  }
  return 'supabase'
}

export function assertApprovedCli() {
  getSupabaseCommand()
}

export function assertLoopback(url, label) {
  if (typeof url !== 'string' || !/^https?:\/\/(127\.0\.0\.1|localhost)([:/]|$)/.test(url)) {
    console.error(`Abbruch: ${label} ("${url}") ist keine lokale Loopback-URL. Dieses Skript darf ausschliesslich gegen die lokale Supabase-Instanz laufen.`)
    process.exit(1)
  }
}

/** Ruft `supabase status -o json` ab und liefert die geparsten Werte (API_URL, ANON_KEY, ...). */
export function getLocalSupabaseStatus() {
  const cmd = getSupabaseCommand()
  const result = spawnSync(cmd, ['status', '-o', 'json'], { cwd: projectRoot, encoding: 'utf-8' })
  if (result.status !== 0) {
    console.error('Abbruch: lokale Supabase-Instanz laeuft nicht oder Status konnte nicht gelesen werden. Zuerst `supabase start` ausfuehren.')
    if (result.stderr) console.error(result.stderr)
    process.exit(1)
  }
  // Vor dem eigentlichen JSON-Block koennen Zeilen wie "Stopped services: ..." stehen -- daher ab
  // der ersten '{' parsen statt stdout blind zu JSON.parse'en.
  const jsonStart = result.stdout.indexOf('{')
  if (jsonStart === -1) {
    console.error('Abbruch: konnte JSON-Status der lokalen Supabase-Instanz nicht lesen.')
    console.error(result.stdout)
    process.exit(1)
  }
  const status = JSON.parse(result.stdout.slice(jsonStart))
  assertLoopback(status.API_URL, 'lokale Supabase API_URL')
  return status
}

/** Fuehrt einen Supabase-CLI-Befehl gegen die lokale Instanz aus und beendet bei Fehlschlag hart. */
export function runSupabaseCli(args, { allowFailure = false } = {}) {
  const cmd = getSupabaseCommand()
  const result = spawnSync(cmd, args, { cwd: projectRoot, stdio: 'inherit' })
  if (!allowFailure && result.status !== 0) {
    console.error(`Abbruch: "supabase ${args.join(' ')}" ist fehlgeschlagen (Exit-Code ${result.status}).`)
    process.exit(result.status ?? 1)
  }
  return result.status ?? 1
}
