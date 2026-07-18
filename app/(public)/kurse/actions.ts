'use server'

import { unstable_cache } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { type KursDBMitAnmeldungen } from '@/types/kurs-form'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  intensivwocheAnmeldungSchema,
  type IntensivwocheAnmeldungInput,
} from '@/types/intensivwoche'

export const getPublicKurse = unstable_cache(
  async (): Promise<KursDBMitAnmeldungen[]> => {
    // Cookie-free client inside unstable_cache (public data, no auth needed)
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data, error } = await supabase
      .from('intensivwoche_kurse_mit_anmeldungen')
      .select('*')
      .eq('ist_aktiv', true)
      .order('start_datum', { ascending: true })

    if (error) {
      console.error('Supabase Error:', error)
      return []
    }

    return data as KursDBMitAnmeldungen[]
  },
  ['public-kurse'],
  { revalidate: 300 }
)

export type AnmeldungResult =
  | { success: true; message: string }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> }

export async function submitIntensivwocheAnmeldung(
  data: IntensivwocheAnmeldungInput
): Promise<AnmeldungResult> {
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
  const kursId = parseInt(parsed.data.kurs_id, 10)

  if (isNaN(kursId)) {
    return {
      success: false,
      error: 'Ungültige Kurs-ID.',
      fieldErrors: { kurs_id: ['Bitte wähle einen gültigen Kurs aus.'] },
    }
  }

  // Schreibt ausschliesslich über die atomare Datenbankfunktion
  // (supabase/migrations/014_atomic_booking_function.sql): sperrt den Kurs,
  // prüft Aktivität/Kapazität/Doppelanmeldung und snapshotted den Preis.
  // Direkte Inserts sind seit dieser Migration per REVOKE nicht mehr erlaubt
  // (verifiziert live am 18.07.2026 über den Supabase-Connector).
  const { error } = await supabase.rpc('book_intensivwoche_kurs', {
    p_kurs_id: kursId,
    p_child_firstname: parsed.data.child_firstname.trim(),
    p_child_lastname: parsed.data.child_lastname.trim(),
    p_child_class_level: parsed.data.child_class_level.trim(),
    p_child_gender: parsed.data.child_gender,
    p_parent_email: parsed.data.parent_email.trim().toLowerCase(),
    p_parent_phone: parsed.data.parent_phone.trim(),
    p_notes: parsed.data.notes?.trim() || undefined,
  })

  if (error) {
    console.error('Supabase Anmeldung Error:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    })

    switch (error.message) {
      case 'kurs_nicht_gefunden':
        return {
          success: false,
          error: 'Der ausgewählte Kurs existiert nicht oder ist nicht mehr verfügbar.',
          fieldErrors: { kurs_id: ['Bitte wähle einen anderen Kurs.'] },
        }
      case 'bereits_angemeldet':
        return {
          success: false,
          error: 'Du bist bereits für diesen Kurs angemeldet.',
        }
      case 'kurs_inaktiv':
        return {
          success: false,
          error: 'Der Kurs ist leider nicht mehr für Anmeldungen verfügbar.',
        }
      case 'voll':
        return {
          success: false,
          error: 'Dieser Kurs ist inzwischen ausgebucht.',
          fieldErrors: { kurs_id: ['Bitte wähle einen anderen Kurs.'] },
        }
      default:
        return {
          success: false,
          error: 'Die Anmeldung konnte nicht gespeichert werden. Bitte versuche es später erneut.',
        }
    }
  }

  return {
    success: true,
    message: 'Vielen Dank für deine Anmeldung! Wir werden uns in Kürze bei dir melden.',
  }
}
