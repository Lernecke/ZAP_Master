'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { type KursDBMitAnmeldungen } from '@/types/kurs-form'

export async function getPublicKurse(): Promise<KursDBMitAnmeldungen[]> {
  const supabase = await createServerSupabaseClient()
  
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
}
