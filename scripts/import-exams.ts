import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
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
  const jsonDir = path.join(process.cwd(), '..', 'ZAP', 'bahrdi-projekt', 'app', 'data', 'json')
  
  if (!fs.existsSync(jsonDir)) {
    console.error(`Directory not found: ${jsonDir}`)
    console.log('Trying alternative path...')
    const altDir = '/Users/robinmuhlemann/Documents/BFH/Master/DIFA/ZAP/bahrdi-projekt/app/data/json'
    if (!fs.existsSync(altDir)) {
      console.error(`Alternative directory also not found: ${altDir}`)
      process.exit(1)
    }
    return importFromDir(altDir)
  }
  
  return importFromDir(jsonDir)
}

async function importFromDir(jsonDir: string) {
  const files = fs.readdirSync(jsonDir).filter(f => f.endsWith('.json'))
  
  console.log(`Found ${files.length} JSON files to import`)
  
  let successCount = 0
  let errorCount = 0
  
  for (const file of files) {
    const filePath = path.join(jsonDir, file)
    const content = fs.readFileSync(filePath, 'utf-8')
    
    try {
      const exam: ExamJson = JSON.parse(content)
      
      const { error } = await supabase
        .from('trainer_exams')
        .upsert({
          id: exam.id,
          title: exam.title,
          subject: exam.subject,
          year: exam.year,
          generated_by: exam.generatedBy || null,
          data: {
            meta: exam.meta,
            questions: exam.questions
          },
          text_lines: exam.textLines || null
        }, {
          onConflict: 'id'
        })
      
      if (error) {
        console.error(`❌ Error importing ${file}:`, error.message)
        errorCount++
      } else {
        console.log(`✅ Imported: ${exam.id}`)
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
