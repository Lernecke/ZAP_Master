// Live-Verfügbarkeit für Bestandskurse (Abschnitt 7, Punkt 2 des Architektur-Briefings): bewusst
// UNGECACHT. Wird von einer Server Component nach await connection() aufgerufen, innerhalb einer
// <Suspense>-Grenze -- nie zusammen mit dem stabilen Katalog aus lib/kurse/catalog.ts gecacht.

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { KursDBMitAnmeldungen } from '@/types/kurs-form'
import type { SessionAvailability } from '@/types/marketing'
import { mapAvailability } from './mapper'

export async function getSessionAvailability(
  kursIds: number[]
): Promise<Map<number, SessionAvailability>> {
  const result = new Map<number, SessionAvailability>()
  if (kursIds.length === 0) return result

  // Anon-Client genügt -- die View ist öffentlich lesbar für aktive Kurse (RLS), keine
  // personenbezogenen Anmeldedaten enthalten.
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data, error } = await supabase
    .from('intensivwoche_kurse_mit_anmeldungen')
    .select('id, aktuelle_teilnehmer, max_teilnehmer, status')
    .in('id', kursIds)

  if (error) {
    console.error('getSessionAvailability:', error)
    return result
  }

  for (const row of data as Pick<
    KursDBMitAnmeldungen,
    'id' | 'aktuelle_teilnehmer' | 'max_teilnehmer' | 'status'
  >[]) {
    result.set(row.id, mapAvailability(row))
  }

  return result
}
