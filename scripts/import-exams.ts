import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

import { getLocalSupabaseStatus } from './lib/local-supabase.mjs'

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
let supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  try {
    const status = getLocalSupabaseStatus()
    supabaseUrl = status.API_URL
    supabaseServiceKey = status.SERVICE_ROLE_KEY
  } catch {
    console.error('Missing environment variables and local Supabase instance is not running.')
    process.exit(1)
  }
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or Service Role Key.')
  process.exit(1)
}

if (!/^https?:\/\/(127\.0\.0\.1|localhost)[:/]/.test(supabaseUrl)) {
  console.error(
    `Refusing to run: NEXT_PUBLIC_SUPABASE_URL ("${supabaseUrl}") sieht nicht nach einer lokalen Supabase-Instanz aus. Dieses Skript darf nur gegen "supabase start" laufen.`
  )
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface ExamJson {
  id: string
  title: string
  subject: 'Math' | 'German'
  year: number
  generatedBy?: string
  textLines?: string[]
  meta?: unknown
  questions: unknown[]
}

async function importExams() {
  const possibleDirs = [
    path.join(process.cwd(), 'app', 'data', 'json'),
    path.join(process.cwd(), 'app', 'data'),
    path.join(process.cwd(), 'data', 'json'),
    path.join(process.cwd(), '..', 'ZAP', 'bahrdi-projekt', 'app', 'data', 'json'),
  ]

  const jsonDir = possibleDirs.find(
    (d) => fs.existsSync(d) && fs.readdirSync(d).some((f) => f.endsWith('.json') && (f.includes('exam') || f.includes('pruefung')))
  ) || possibleDirs.find((d) => fs.existsSync(d) && fs.readdirSync(d).some((f) => f.endsWith('.json')))

  if (!jsonDir) {
    console.error(`No exam JSON files found in paths: ${possibleDirs.join(', ')}`)
    process.exit(1)
  }

  console.log(`Using directory: ${jsonDir}`)
  return importFromDir(jsonDir)
}

async function importFromDir(jsonDir: string) {
  const files = fs.readdirSync(jsonDir).filter(f => f.endsWith('.json'))
  
  console.log(`Found ${files.length} JSON files to inspect in ${jsonDir}`)
  
  let successCount = 0
  let errorCount = 0
  
  for (const file of files) {
    const filePath = path.join(jsonDir, file)
    const content = fs.readFileSync(filePath, 'utf-8')
    
    try {
      const raw: any = JSON.parse(content)

      // Skip exercise files that are not exams unless they explicitly contain exam structures
      if (file.includes('exercise') && !raw.exam && !raw.questions) {
        console.log(`⏭️  Skipping non-exam file: ${file}`)
        continue
      }
      
      const id = raw.id || file.replace(/\.json$/, '').replace(/_/g, '-')
      const title = raw.title || raw.exam?.title || 'Mathematik Prüfung'
      const subject = raw.subject || (file.includes('math') || file.includes('mathematik') ? 'Math' : 'German')
      const year = raw.year || 2024
      const generatedBy = raw.generatedBy || raw.generated_by || null
      const textLines = raw.textLines || raw.text_lines || null
      const questions = raw.questions || raw.exam?.tasks || []
      const meta = raw.meta || { maxPoints: 50, hints: [] }

      const { error } = await supabase
        .from('trainer_exams')
        .upsert({
          id,
          title,
          subject,
          year,
          generated_by: generatedBy,
          data: {
            meta,
            questions,
          },
          text_lines: textLines,
        }, {
          onConflict: 'id',
        })
      
      if (error) {
        console.error(`❌ Error importing ${file}:`, error.message)
        errorCount++
      } else {
        console.log(`✅ Imported: ${id} (${title})`)
        successCount++
      }
    } catch (e) {
      console.error(`❌ Failed to parse ${file}:`, e)
      errorCount++
    }
  }
  
  console.log(`\n📊 Import complete: ${successCount} successful, ${errorCount} failed`)
}

importExams()
