/**
 * Import all exam JSON files into Supabase trainer_exams table
 * Run with: npx tsx scripts/import-all-exams.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'

// Load environment variables from .env.local
const envPath = path.join(process.cwd(), '.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')
const envVars: Record<string, string> = {}
envContent.split('\n').forEach((line) => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim()
  }
})

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL']
const supabaseServiceKey = envVars['SUPABASE_SERVICE_ROLE_KEY']

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

// Sicherheitsnetz nachgetragen (Env-Separation-Audit, Abschnitt 10.4): .env.local zeigt laut
// CLAUDE.md bewusst auf das LIVE-Projekt. Dieses Skript schrieb bisher ungeprueft mit
// service_role (RLS-Bypass) dorthin -- ein versehentlicher Lauf haette Pruefungsdaten direkt in
// Produktion geschrieben. Wie scripts/concurrency-test-booking.ts: nur gegen eine lokale
// Loopback-Instanz zulassen.
if (!/^https?:\/\/(127\.0\.0\.1|localhost)[:/]/.test(supabaseUrl)) {
  console.error(
    `Refusing to run: NEXT_PUBLIC_SUPABASE_URL ("${supabaseUrl}") sieht nicht nach einer lokalen Supabase-Instanz aus. Dieses Skript darf nur gegen "supabase start" laufen.`
  )
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Path to JSON files
const jsonDir = path.join(
  process.cwd(),
  '..',
  'ZAP',
  'bahrdi-projekt',
  'app',
  'data',
  'json'
)

// Already imported IDs - skip these
const alreadyImported = new Set([
  'math-2022-claude',
  'math-2023-claude',
  'math-2024-claude',
  'german-2023-claude',
])

// ID normalization map
function normalizeId(originalId: string, filename: string): string {
  // Extract base from filename (e.g., "math-2022-gemini.json" -> "math-2022-gemini")
  const baseFromFilename = filename.replace('.json', '')
  return baseFromFilename
}

interface ExamData {
  id: string
  title: string
  subject: 'Math' | 'German'
  year: number
  generatedBy?: string
  textLines?: string[]
  meta: unknown
  questions: unknown[]
}

async function importExams() {
  console.log('Starting exam import...')
  console.log('JSON directory:', jsonDir)

  if (!fs.existsSync(jsonDir)) {
    console.error('JSON directory not found:', jsonDir)
    process.exit(1)
  }

  const files = fs.readdirSync(jsonDir).filter((f) => f.endsWith('.json'))
  console.log(`Found ${files.length} JSON files`)

  let imported = 0
  let skipped = 0
  let errors = 0

  for (const file of files) {
    const normalizedId = normalizeId('', file)

    if (alreadyImported.has(normalizedId)) {
      console.log(`⏭️  Skipping ${file} (already imported)`)
      skipped++
      continue
    }

    try {
      const filePath = path.join(jsonDir, file)
      const content = fs.readFileSync(filePath, 'utf-8')
      const examData: ExamData = JSON.parse(content)

      // Prepare record for insertion
      const record = {
        id: normalizedId,
        title: examData.title,
        subject: examData.subject,
        year: examData.year,
        generated_by: examData.generatedBy || null,
        text_lines: examData.textLines || null,
        data: {
          meta: examData.meta,
          questions: examData.questions,
        },
      }

      const { error } = await supabase.from('trainer_exams').upsert(record, {
        onConflict: 'id',
      })

      if (error) {
        console.error(`❌ Error importing ${file}:`, error.message)
        errors++
      } else {
        console.log(`✅ Imported: ${normalizedId} - ${examData.title}`)
        imported++
      }
    } catch (e) {
      console.error(`❌ Failed to process ${file}:`, e)
      errors++
    }
  }

  console.log('\n--- Import Summary ---')
  console.log(`✅ Imported: ${imported}`)
  console.log(`⏭️  Skipped: ${skipped}`)
  console.log(`❌ Errors: ${errors}`)
  console.log(`Total: ${files.length}`)
}

importExams()
