'use server'

import { createAuthenticatedSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { auth } from '@/lib/auth/config'
import { kursFormSchema, type KursFormInput, type KursDB, type KursDBMitAnmeldungen } from '@/types/kurs-form'
import { revalidatePath } from 'next/cache'

export type KursResult<T = void> = 
  | { success: true; data?: T; message: string }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> }

/**
 * Prüft ob der Benutzer authentifiziert ist und gibt User-Daten zurück
 * Gibt auch den Supabase Access Token zurück für authentifizierte Anfragen
 */
async function requireAuth(): Promise<
  | { authenticated: true; userId: string; role: string; supabaseAccessToken: string }
  | { authenticated: false; error: KursResult }
> {
  const session = await auth()
  if (!session?.user || !session.supabaseAccessToken) {
    return {
      authenticated: false,
      error: { success: false, error: 'Du musst angemeldet sein, um diese Aktion auszuführen.' }
    }
  }
  return { 
    authenticated: true, 
    userId: session.user.id,
    role: session.user.role || 'user',
    supabaseAccessToken: session.supabaseAccessToken
  }
}

// Kurse laden (gefiltert nach Rolle)
// Admins sehen alle Kurse, Lehrpersonen nur eigene
export async function getKurse(): Promise<KursResult<KursDBMitAnmeldungen[]>> {
  const authCheck = await requireAuth()
  if (!authCheck.authenticated) return authCheck.error as KursResult<KursDBMitAnmeldungen[]>

  // Authentifizierter Client mit RLS
  const supabase = createAuthenticatedSupabaseClient(authCheck.supabaseAccessToken)
  
  // Query bauen - Admins sehen alles, Lehrpersonen nur eigene Kurse
  let query = supabase
    .from('intensivwoche_kurse_mit_anmeldungen')
    .select('*')
  
  // Lehrpersonen sehen nur ihre eigenen Kurse (Principle of Least Privilege)
  if (authCheck.role !== 'admin') {
    query = query.eq('created_by', authCheck.userId)
  }
  
  const { data, error } = await query.order('start_datum', { ascending: true })

  if (error) {
    console.error('Supabase Error:', error)
    return { success: false, error: 'Kurse konnten nicht geladen werden.' }
  }

  return { 
    success: true, 
    data: data as KursDBMitAnmeldungen[], 
    message: 'Kurse geladen' 
  }
}

// Aktive Kurse laden (für öffentliche Seite)
export async function getAktiveKurse(): Promise<KursResult<KursDBMitAnmeldungen[]>> {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('intensivwoche_kurse_mit_anmeldungen')
    .select('*')
    .eq('ist_aktiv', true)
    .order('start_datum', { ascending: true })

  if (error) {
    console.error('Supabase Error:', error)
    return { success: false, error: 'Kurse konnten nicht geladen werden.' }
  }

  return { 
    success: true, 
    data: data as KursDBMitAnmeldungen[], 
    message: 'Kurse geladen' 
  }
}

// Einzelnen Kurs laden (gefiltert nach Rolle)
export async function getKurs(id: number): Promise<KursResult<KursDB>> {
  const authCheck = await requireAuth()
  if (!authCheck.authenticated) return authCheck.error as KursResult<KursDB>

  const supabase = createAuthenticatedSupabaseClient(authCheck.supabaseAccessToken)
  
  // Query bauen
  let query = supabase
    .from('intensivwoche_kurse')
    .select('*')
    .eq('id', id)
  
  // Lehrpersonen dürfen nur eigene Kurse laden
  if (authCheck.role !== 'admin') {
    query = query.eq('created_by', authCheck.userId)
  }
  
  const { data, error } = await query.single()

  if (error) {
    console.error('Supabase Error:', error)
    // Unterscheide zwischen "nicht gefunden" und "kein Zugriff"
    if (error.code === 'PGRST116') {
      return { success: false, error: 'Kurs nicht gefunden oder keine Berechtigung.' }
    }
    return { success: false, error: 'Kurs konnte nicht geladen werden.' }
  }

  return { 
    success: true, 
    data: data as KursDB, 
    message: 'Kurs geladen' 
  }
}

// Neuen Kurs erstellen
export async function createKurs(input: KursFormInput): Promise<KursResult<KursDB>> {
  const authCheck = await requireAuth()
  if (!authCheck.authenticated) return authCheck.error as KursResult<KursDB>

  // Server-seitige Validierung
  const parsed = kursFormSchema.safeParse(input)
  
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

  const supabase = createAuthenticatedSupabaseClient(authCheck.supabaseAccessToken)

  const { data, error } = await supabase
    .from('intensivwoche_kurse')
    .insert({
      name: parsed.data.name.trim(),
      fach: parsed.data.fach,
      beschreibung: parsed.data.beschreibung.trim(),
      detail_beschreibung: parsed.data.detail_beschreibung?.trim() || null,
      start_datum: parsed.data.start_datum,
      end_datum: parsed.data.end_datum,
      uhrzeit: parsed.data.uhrzeit.trim(),
      ort: parsed.data.ort.trim(),
      preis: parsed.data.preis,
      max_teilnehmer: parsed.data.max_teilnehmer,
      klassenstufen: parsed.data.klassenstufen,
      lehrer: parsed.data.lehrer.trim(),
      highlights: parsed.data.highlights || [],
      ist_aktiv: parsed.data.ist_aktiv,
      created_by: authCheck.userId, // Owner-Tracking für RLS
    })
    .select()
    .single()

  if (error) {
    console.error('Supabase Error:', error)
    return {
      success: false,
      error: 'Der Kurs konnte nicht erstellt werden. Bitte versuche es später erneut.',
    }
  }

  revalidatePath('/dashboard/kurse')
  revalidatePath('/kurse')

  return {
    success: true,
    data: data as KursDB,
    message: 'Kurs erfolgreich erstellt!',
  }
}

// Kurs bearbeiten
export async function updateKurs(id: number, input: KursFormInput): Promise<KursResult<KursDB>> {
  const authCheck = await requireAuth()
  if (!authCheck.authenticated) return authCheck.error as KursResult<KursDB>

  // Server-seitige Validierung
  const parsed = kursFormSchema.safeParse(input)
  
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

  const supabase = createAuthenticatedSupabaseClient(authCheck.supabaseAccessToken)

  // Query bauen mit Berechtigungsprüfung
  let query = supabase
    .from('intensivwoche_kurse')
    .update({
      name: parsed.data.name.trim(),
      fach: parsed.data.fach,
      beschreibung: parsed.data.beschreibung.trim(),
      detail_beschreibung: parsed.data.detail_beschreibung?.trim() || null,
      start_datum: parsed.data.start_datum,
      end_datum: parsed.data.end_datum,
      uhrzeit: parsed.data.uhrzeit.trim(),
      ort: parsed.data.ort.trim(),
      preis: parsed.data.preis,
      max_teilnehmer: parsed.data.max_teilnehmer,
      klassenstufen: parsed.data.klassenstufen,
      lehrer: parsed.data.lehrer.trim(),
      highlights: parsed.data.highlights || [],
      ist_aktiv: parsed.data.ist_aktiv,
    })
    .eq('id', id)
  
  // Lehrpersonen dürfen nur eigene Kurse bearbeiten
  if (authCheck.role !== 'admin') {
    query = query.eq('created_by', authCheck.userId)
  }
  
  const { data, error } = await query.select().single()

  if (error) {
    console.error('Supabase Error:', error)
    if (error.code === 'PGRST116') {
      return {
        success: false,
        error: 'Kurs nicht gefunden oder keine Berechtigung zur Bearbeitung.',
      }
    }
    return {
      success: false,
      error: 'Der Kurs konnte nicht aktualisiert werden.',
    }
  }

  revalidatePath('/dashboard/kurse')
  revalidatePath('/kurse')

  return {
    success: true,
    data: data as KursDB,
    message: 'Kurs erfolgreich aktualisiert!',
  }
}

// Kurs löschen (nur eigene Kurse oder Admin)
export async function deleteKurs(id: number): Promise<KursResult> {
  const authCheck = await requireAuth()
  if (!authCheck.authenticated) return authCheck.error

  const supabase = createAuthenticatedSupabaseClient(authCheck.supabaseAccessToken)

  // Query bauen mit Berechtigungsprüfung
  let query = supabase
    .from('intensivwoche_kurse')
    .delete()
    .eq('id', id)
  
  // Lehrpersonen dürfen nur eigene Kurse löschen
  if (authCheck.role !== 'admin') {
    query = query.eq('created_by', authCheck.userId)
  }

  const { error } = await query

  if (error) {
    console.error('Supabase Error:', error)
    return {
      success: false,
      error: 'Der Kurs konnte nicht gelöscht werden.',
    }
  }

  revalidatePath('/dashboard/kurse')
  revalidatePath('/kurse')

  return {
    success: true,
    message: 'Kurs erfolgreich gelöscht!',
  }
}

// Kurs aktivieren/deaktivieren (nur eigene Kurse oder Admin)
export async function toggleKursStatus(id: number, istAktiv: boolean): Promise<KursResult> {
  const authCheck = await requireAuth()
  if (!authCheck.authenticated) return authCheck.error

  const supabase = createAuthenticatedSupabaseClient(authCheck.supabaseAccessToken)

  // Query bauen mit Berechtigungsprüfung
  let query = supabase
    .from('intensivwoche_kurse')
    .update({ ist_aktiv: istAktiv })
    .eq('id', id)
  
  // Lehrpersonen dürfen nur eigene Kurse ändern
  if (authCheck.role !== 'admin') {
    query = query.eq('created_by', authCheck.userId)
  }

  const { error } = await query

  if (error) {
    console.error('Supabase Error:', error)
    return {
      success: false,
      error: 'Der Kursstatus konnte nicht geändert werden.',
    }
  }

  revalidatePath('/dashboard/kurse')
  revalidatePath('/kurse')

  return {
    success: true,
    message: istAktiv ? 'Kurs aktiviert!' : 'Kurs deaktiviert!',
  }
}
