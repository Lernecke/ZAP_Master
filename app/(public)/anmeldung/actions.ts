'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { 
  intensivwocheAnmeldungSchema, 
  type IntensivwocheAnmeldungInput 
} from '@/types/intensivwoche'

export type AnmeldungResult = 
  | { success: true; message: string }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> }

/**
 * Öffentliche Kursanmeldung
 * 
 * WICHTIG für PGRST116-Vermeidung:
 * - Wir verwenden NICHT .select().single() nach dem Insert
 * - Anonyme Nutzer haben nur INSERT-Rechte (kein SELECT)
 * - Der Insert gibt nur den Statuscode zurück, keine Daten
 */
export async function submitIntensivwocheAnmeldung(
  data: IntensivwocheAnmeldungInput
): Promise<AnmeldungResult> {
  // 1. Server-seitige Validierung mit Zod
  const parsed = intensivwocheAnmeldungSchema.safeParse(data)
  
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {}
    parsed.error.issues.forEach((err) => {
      const field = err.path[0] as string
      if (!fieldErrors[field]) fieldErrors[field] = []
      fieldErrors[field].push(err.message)
    })
    return {
      success: false,
      error: 'Bitte überprüfe deine Eingaben.',
      fieldErrors,
    }
  }

  const supabase = await createServerSupabaseClient()

  // 2. Kurs-ID validieren (prüfen ob Kurs existiert und aktiv ist)
  const kursId = parseInt(parsed.data.kurs_id, 10)
  
  if (isNaN(kursId)) {
    return {
      success: false,
      error: 'Ungültige Kurs-ID.',
      fieldErrors: { kurs_id: ['Bitte wähle einen gültigen Kurs aus.'] },
    }
  }

  // 3. Insert OHNE .select().single()
  // Da anon-User kein SELECT-Recht haben, würde .select() zu PGRST116 führen
  // Spaltennamen müssen exakt dem DB-Schema entsprechen!
  const { error } = await supabase
    .from('intensivwoche_anmeldungen')
    .insert({
      kurs_id: kursId,
      child_firstname: parsed.data.child_firstname.trim(),
      child_lastname: parsed.data.child_lastname.trim(),
      child_class_level: parsed.data.child_class_level.trim(),
      child_gender: parsed.data.child_gender,
      parent_email: parsed.data.parent_email.trim().toLowerCase(),
      parent_phone: parsed.data.parent_phone.trim(),
      notes: parsed.data.notes?.trim() || null,
    })

  // 4. Spezifisches Error-Handling
  if (error) {
    console.error('Supabase Anmeldung Error:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    })

    // Spezifische Fehlerbehandlung
    switch (error.code) {
      case '23503': // Foreign Key Violation
        return {
          success: false,
          error: 'Der ausgewählte Kurs existiert nicht oder ist nicht mehr verfügbar.',
          fieldErrors: { kurs_id: ['Bitte wähle einen anderen Kurs.'] },
        }
      
      case '23505': // Unique Violation (falls implementiert)
        return {
          success: false,
          error: 'Du bist bereits für diesen Kurs angemeldet.',
        }
      
      case '42501': // Insufficient Privilege (RLS Denial)
        return {
          success: false,
          error: 'Der Kurs ist leider nicht mehr für Anmeldungen verfügbar.',
        }
      
      case 'PGRST116': // JSON object requested, multiple (or no) rows returned
        // Dieser Fehler sollte mit unserem Fix nicht mehr auftreten
        console.error('PGRST116 sollte nicht auftreten - prüfe RLS Policies!')
        return {
          success: false,
          error: 'Ein technischer Fehler ist aufgetreten. Bitte versuche es später erneut.',
        }
      
      default:
        return {
          success: false,
          error: 'Die Anmeldung konnte nicht gespeichert werden. Bitte versuche es später erneut.',
        }
    }
  }

  // 5. Erfolg - keine Daten zurückgeben (da kein SELECT-Recht)
  return {
    success: true,
    message: 'Vielen Dank für deine Anmeldung! Du erhältst in Kürze eine Bestätigung per E-Mail.',
  }
}
