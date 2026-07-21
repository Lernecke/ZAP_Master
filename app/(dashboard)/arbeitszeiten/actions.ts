'use server'

// Schritt 10c (Abschnitt 2.14 des Architektur-Briefings): Lehrpersonen-Server-Actions fuer eigene
// Arbeitszeiten. RLS (work_entries_own_insert_draft/_own_update_draft_or_rejected/_own_read) ist
// die eigentliche Autorisierungsquelle; requireTeacherAuth() spiegelt sie nur fuer eine fruehe,
// verstaendliche Fehlermeldung.

import { createAuthenticatedSupabaseClient } from '@/lib/supabase/server'
import { auth } from '@/lib/auth/config'
import { revalidatePath } from 'next/cache'
import {
  workEntryFormSchema,
  type WorkEntryFormInput,
  type WorkEntryDB,
  type ArbeitszeitActionResult,
} from '@/types/kurs-arbeitszeit'

async function requireTeacherAuth(): Promise<
  | { authorized: true; userId: string; supabaseAccessToken: string }
  | { authorized: false; error: ArbeitszeitActionResult<never> }
> {
  const session = await auth()
  if (!session?.user || !session.supabaseAccessToken) {
    return { authorized: false, error: { success: false, error: 'Du musst angemeldet sein, um diese Aktion auszuführen.' } }
  }
  if (session.user.role !== 'lehrperson' && session.user.role !== 'admin') {
    return { authorized: false, error: { success: false, error: 'Nur Lehrpersonen erfassen eigene Arbeitszeiten.' } }
  }
  return { authorized: true, userId: session.user.id, supabaseAccessToken: session.supabaseAccessToken }
}

export async function getOwnWorkEntries(): Promise<ArbeitszeitActionResult<WorkEntryDB[]>> {
  const authCheck = await requireTeacherAuth()
  if (!authCheck.authorized) return authCheck.error

  const supabase = createAuthenticatedSupabaseClient(authCheck.supabaseAccessToken)
  const { data, error } = await supabase
    .from('work_entries')
    .select('*')
    .eq('teacher_id', authCheck.userId)
    .order('work_date', { ascending: false })

  if (error) {
    console.error('Supabase Error:', error)
    return { success: false, error: 'Arbeitszeiten konnten nicht geladen werden.' }
  }

  return { success: true, data: data as WorkEntryDB[], message: 'Arbeitszeiten geladen' }
}

export type AssignedSessionOption = { kursId: number; label: string }

export async function getOwnAssignedSessions(): Promise<ArbeitszeitActionResult<AssignedSessionOption[]>> {
  const authCheck = await requireTeacherAuth()
  if (!authCheck.authorized) return authCheck.error

  const supabase = createAuthenticatedSupabaseClient(authCheck.supabaseAccessToken)
  const { data, error } = await supabase
    .from('teacher_assignments')
    .select('session_id, kurs:intensivwoche_kurse!teacher_assignments_session_id_fkey(id, name, ort)')
    .eq('teacher_id', authCheck.userId)

  if (error) {
    console.error('Supabase Error:', error)
    return { success: false, error: 'Zuteilungen konnten nicht geladen werden.' }
  }

  type Row = { session_id: number; kurs: { name: string; ort: string } | null }
  const options: AssignedSessionOption[] = (data as unknown as Row[])
    .filter((row) => row.kurs)
    .map((row) => ({ kursId: row.session_id, label: `${row.kurs!.name} · ${row.kurs!.ort}` }))

  return { success: true, data: options, message: 'Zuteilungen geladen' }
}

export async function saveWorkEntryAction(
  entryId: string | null,
  expectedVersion: number | null,
  input: WorkEntryFormInput
): Promise<ArbeitszeitActionResult<WorkEntryDB>> {
  const authCheck = await requireTeacherAuth()
  if (!authCheck.authorized) return authCheck.error

  const parsed = workEntryFormSchema.safeParse(input)
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {}
    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0] as string
      if (!fieldErrors[field]) fieldErrors[field] = []
      fieldErrors[field].push(issue.message)
    })
    return { success: false, error: 'Bitte überprüfe deine Eingaben.', fieldErrors }
  }

  const data = parsed.data
  const supabase = createAuthenticatedSupabaseClient(authCheck.supabaseAccessToken)
  const payload = {
    activity_type: data.activityType,
    work_date: data.workDate,
    duration_minutes: data.durationMinutes,
    session_id: data.activityType === 'course_teaching' ? data.sessionId ?? null : null,
    note: data.note || null,
  }

  if (entryId === null) {
    const { data: created, error } = await supabase
      .from('work_entries')
      .insert({ ...payload, teacher_id: authCheck.userId, status: 'draft' })
      .select()
      .single()

    if (error) {
      console.error('Supabase Error:', error)
      return { success: false, error: 'Eintrag konnte nicht erstellt werden.' }
    }
    revalidatePath('/arbeitszeiten')
    return { success: true, data: created as WorkEntryDB, message: 'Eintrag gespeichert.' }
  }

  const { data: updated, error } = await supabase
    .from('work_entries')
    .update(payload)
    .eq('id', entryId)
    .eq('version', expectedVersion ?? -1)
    .select()
    .single()

  if (error || !updated) {
    return { success: false, error: 'Der Eintrag wurde zwischenzeitlich geändert. Bitte lade die Seite neu.' }
  }
  revalidatePath('/arbeitszeiten')
  return { success: true, data: updated as WorkEntryDB, message: 'Eintrag aktualisiert.' }
}

export async function submitWorkEntryAction(
  entryId: string,
  expectedVersion: number
): Promise<ArbeitszeitActionResult<WorkEntryDB>> {
  const authCheck = await requireTeacherAuth()
  if (!authCheck.authorized) return authCheck.error

  const supabase = createAuthenticatedSupabaseClient(authCheck.supabaseAccessToken)
  const { data: updated, error } = await supabase
    .from('work_entries')
    .update({ status: 'submitted' })
    .eq('id', entryId)
    .eq('version', expectedVersion)
    .select()
    .single()

  if (error || !updated) {
    return { success: false, error: 'Eintrag konnte nicht eingereicht werden. Bitte lade die Seite neu.' }
  }
  revalidatePath('/arbeitszeiten')
  return { success: true, data: updated as WorkEntryDB, message: 'Eintrag zur Prüfung eingereicht.' }
}
