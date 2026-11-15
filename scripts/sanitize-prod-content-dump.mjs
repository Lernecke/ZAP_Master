#!/usr/bin/env node
// Extrahiert ausschliesslich nicht-personenbezogene Inhalts-/Katalogtabellen aus einem lokalen
// `supabase db dump --data-only --use-copy=false` oder `pg_dump --data-only --column-inserts`
// nach `supabase/seeds/prod-content.sql`, bereinigt `created_by`-UUIDs (FK auf auth.users) zu NULL
// und macht alle Inserts idempotent (`ON CONFLICT DO NOTHING`) inkl. Sequenz-Reset.
//
// Nutzung: node scripts/sanitize-prod-content-dump.mjs [pfad/zum/dump.sql]

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')

const defaultInput = path.join(projectRoot, 'docs', 'migration-evidence', 'private', 'backups', 'prod-content-dump.sql')
const inputPath = process.argv[2] ? path.resolve(process.cwd(), process.argv[2]) : defaultInput
const outputPath = path.join(projectRoot, 'supabase', 'seeds', 'prod-content.sql')

// Reihenfolge beachtet Foreign Keys (subjects -> exercises -> tasks; subjects -> learning_materials).
// Keine PII-, Auth-, Buchungs- oder Finanztabellen!
const ALLOWED_TABLES = [
  'subjects',
  'exercises',
  'tasks',
  'math_solution_steps',
  'learning_materials',
  'trainer_exams',
  'badges',
]

const SERIAL_ID_TABLES = ['subjects', 'exercises', 'tasks', 'learning_materials', 'badges']

if (!existsSync(inputPath)) {
  console.error(`Abbruch: Dump-Datei nicht gefunden: ${inputPath}`)
  process.exit(1)
}

const rawSql = readFileSync(inputPath, 'utf-8')

/**
 * Extrahiert das INSERT-Statement fuer `tableName` anhand des pg_dump-Abschnittsheaders
 * (`-- Data for Name: <table>; Type: TABLE DATA; Schema: public;`), sodass fruehere
 * PII-/Auth-Abschnitte (inkl. evtl. E'...'-Escapes) gar nicht erst geparst werden muessen.
 */
function extractTableInsert(sql, tableName) {
  const headerRe = new RegExp(
    `-- Data for Name: ${tableName}; Type: TABLE DATA; Schema: public;[^\\n]*\\n--\\s*\\n`,
    'm'
  )
  const headerMatch = headerRe.exec(sql)
  if (!headerMatch) return null

  const sectionStart = headerMatch.index + headerMatch[0].length
  const nextHeaderIdx = sql.indexOf('\n--\n-- ', sectionStart)
  const section = (nextHeaderIdx === -1 ? sql.slice(sectionStart) : sql.slice(sectionStart, nextHeaderIdx)).trim()

  if (!section || !/^INSERT INTO\s+/i.test(section)) return null
  return section
}

/**
 * Transformiert eine Spalte in jedem VALUES-Tupel eines INSERT-Statements:
 * - `'nullify'`: ersetzt den Wert durch `NULL`
 * - `'drop'`: entfernt Spalte und zugehoerigen Wert komplett (z.B. fuer Spalten, die lokal nicht existieren)
 */
function transformColumnInInsert(insertStmt, colName, mode) {
  const valuesMatch = /\)\s+VALUES\s+/i.exec(insertStmt)
  if (!valuesMatch) return insertStmt

  const headerEnd = valuesMatch.index
  const colListStart = insertStmt.indexOf('(')
  const cols = insertStmt
    .slice(colListStart + 1, headerEnd)
    .split(',')
    .map((c) => c.trim().replace(/^"|"$/g, ''))

  const colIndex = cols.indexOf(colName)
  if (colIndex === -1) return insertStmt

  let prefix = insertStmt.slice(0, valuesMatch.index + valuesMatch[0].length)
  if (mode === 'drop') {
    const keptCols = cols.filter((_, idx) => idx !== colIndex).map((c) => `"${c}"`).join(', ')
    prefix = `${insertStmt.slice(0, colListStart + 1)}${keptCols}${insertStmt.slice(headerEnd, valuesMatch.index + valuesMatch[0].length)}`
  }
  const body = insertStmt.slice(valuesMatch.index + valuesMatch[0].length)

  // Tupel-Parser: transformiert exakt das colIndex-te Feld in jedem Top-Level-Tupel `(...)`.
  let out = ''
  let i = 0
  while (i < body.length) {
    if (body[i] !== '(') {
      out += body[i]
      i++
      continue
    }

    // Wir sind am Beginn eines Tupels `(`
    out += '('
    i++
    let currentCol = 0
    let depth = 0
    let inString = false
    let fieldStart = i
    const fields = []

    while (i < body.length) {
      const ch = body[i]
      const next = body[i + 1]

      if (inString) {
        if (ch === "'" && next === "'") {
          i += 2
          continue
        }
        if (ch === "'") {
          inString = false
        }
        i++
        continue
      }

      if (ch === "'") {
        inString = true
        i++
        continue
      }

      if (ch === '(') {
        depth++
        i++
        continue
      }

      if (ch === ')') {
        if (depth === 0) {
          const fieldVal = body.slice(fieldStart, i)
          if (currentCol !== colIndex || mode !== 'drop') {
            fields.push(currentCol === colIndex ? 'NULL' : fieldVal)
          }
          out += fields.join(',') + ')'
          i++
          break
        }
        depth--
        i++
        continue
      }

      if (ch === ',' && depth === 0) {
        const fieldVal = body.slice(fieldStart, i)
        if (currentCol !== colIndex || mode !== 'drop') {
          fields.push(currentCol === colIndex ? 'NULL' : fieldVal)
        }
        currentCol++
        i++
        fieldStart = i
        continue
      }

      i++
    }
  }

  return prefix + out
}

const byTable = new Map(ALLOWED_TABLES.map((t) => [t, []]))

for (const tableName of ALLOWED_TABLES) {
  const stmt = extractTableInsert(rawSql, tableName)
  if (!stmt) continue

  let cleaned = stmt
  if (tableName === 'learning_materials') {
    cleaned = transformColumnInInsert(cleaned, 'created_by', 'nullify')
  } else if (tableName === 'exercises') {
    cleaned = transformColumnInInsert(cleaned, 'class_levels', 'drop')
  }

  // Idempotent machen: trailing `;` durch `\nON CONFLICT DO NOTHING;` ersetzen
  cleaned = cleaned.replace(/;\s*$/, '\nON CONFLICT DO NOTHING;')
  byTable.get(tableName).push(cleaned)
}

const outputLines = [
  '-- ============================================================================',
  '-- Bereinigter Content-Seed aus Production (ohne PII-/Auth-/Buchungsdaten)',
  '-- Generiert durch: node scripts/sanitize-prod-content-dump.mjs',
  '-- ============================================================================',
  "SET client_encoding = 'UTF8';",
  'SET standard_conforming_strings = on;',
  '',
]

let totalStatements = 0
for (const table of ALLOWED_TABLES) {
  const list = byTable.get(table)
  if (!list || list.length === 0) continue
  outputLines.push(`-- Table: public.${table} (${list.length} INSERT statement(s))`)
  outputLines.push(...list)
  outputLines.push('')
  totalStatements += list.length
}

outputLines.push('-- Sequenzen synchronisieren, damit lokale UI-Inserts keine PK-Konflikte erzeugen')
for (const table of SERIAL_ID_TABLES) {
  outputLines.push(
    `SELECT pg_catalog.setval(pg_get_serial_sequence('public.${table}', 'id'), COALESCE((SELECT MAX(id) FROM public.${table}), 1), true);`
  )
}
outputLines.push('')

mkdirSync(path.dirname(outputPath), { recursive: true })
writeFileSync(outputPath, outputLines.join('\n'), 'utf-8')

console.log(`OK: ${totalStatements} INSERT-Statement(s) nach ${path.relative(projectRoot, outputPath)} geschrieben.`)
for (const table of ALLOWED_TABLES) {
  console.log(`  - public.${table}: ${byTable.get(table).length}`)
}
