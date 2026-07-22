'use server'

// Abschnitt 10.4 (E-Mail-Outbox): admin-only Sicht auf mail_outbox, damit dauerhafte
// Zustellfehler sichtbar sind statt nur in DB-Zeilen zu verschwinden. Lesen laeuft ueber den
// authentifizierten Client (RLS: mail_outbox_admin_select erlaubt nur is_admin()), das manuelle
// Verarbeiten ruft denselben Dispatcher wie der Cron-Endpunkt auf (lib/mail/dispatch-outbox.ts).

import { auth } from '@/lib/auth/config'
import { createAuthenticatedSupabaseClient } from '@/lib/supabase/server'
import { dispatchDueOutboxMails, type DispatchResult } from '@/lib/mail/dispatch-outbox'
import { revalidatePath } from 'next/cache'

export interface MailOutboxRowView {
  id: string
  status: string
  attempts: number
  maxAttempts: number
  lastError: string | null
  nextAttemptAt: string
  createdAt: string
  sentAt: string | null
  kursName: string | null
  childName: string | null
}

type ActionResult<T> = { success: true; data: T } | { success: false; error: string }

async function requireAdminSession(): Promise<
  { authorized: true; supabaseAccessToken: string } | { authorized: false; error: string }
> {
  const session = await auth()
  if (!session?.user || !session.supabaseAccessToken) {
    return { authorized: false, error: 'Du musst angemeldet sein, um diese Aktion auszuführen.' }
  }
  if (session.user.role !== 'admin') {
    return { authorized: false, error: 'Nur Administratorinnen und Administratoren sehen die Mail-Warteschlange.' }
  }
  return { authorized: true, supabaseAccessToken: session.supabaseAccessToken }
}

export async function getMailOutboxRows(): Promise<ActionResult<MailOutboxRowView[]>> {
  const auth_ = await requireAdminSession()
  if (!auth_.authorized) return { success: false, error: auth_.error }

  const supabase = createAuthenticatedSupabaseClient(auth_.supabaseAccessToken)

  const { data, error } = await supabase
    .from('mail_outbox')
    .select('id, anmeldung_id, status, attempts, max_attempts, last_error, next_attempt_at, created_at, sent_at')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) return { success: false, error: error.message }

  // Zwei getrennte Abfragen statt eines PostgREST-Embeds (`intensivwoche_anmeldungen(...)`):
  // robuster gegen die generische Typinferenz der generierten Supabase-Typen bei verschachtelten
  // Selects und explizit genug, um leicht nachvollziehbar zu bleiben.
  const anmeldungIds = Array.from(new Set((data ?? []).map((row) => row.anmeldung_id)))
  const anmeldungenById = new Map<string, { child_firstname: string; child_lastname: string; kurs_id: number | null }>()
  if (anmeldungIds.length > 0) {
    const { data: anmeldungen } = await supabase
      .from('intensivwoche_anmeldungen')
      .select('id, child_firstname, child_lastname, kurs_id')
      .in('id', anmeldungIds)
    for (const anmeldung of anmeldungen ?? []) {
      anmeldungenById.set(anmeldung.id, anmeldung)
    }
  }

  const kursIds = Array.from(
    new Set(Array.from(anmeldungenById.values()).map((a) => a.kurs_id).filter((id): id is number => id != null))
  )
  const kursNamesById = new Map<number, string>()
  if (kursIds.length > 0) {
    const { data: kurse } = await supabase.from('intensivwoche_kurse').select('id, name').in('id', kursIds)
    for (const kurs of kurse ?? []) kursNamesById.set(kurs.id, kurs.name)
  }

  const rows: MailOutboxRowView[] = (data ?? []).map((row) => {
    const anmeldung = anmeldungenById.get(row.anmeldung_id)
    return {
      id: row.id,
      status: row.status,
      attempts: row.attempts,
      maxAttempts: row.max_attempts,
      lastError: row.last_error,
      nextAttemptAt: row.next_attempt_at,
      createdAt: row.created_at,
      sentAt: row.sent_at,
      kursName: anmeldung?.kurs_id != null ? kursNamesById.get(anmeldung.kurs_id) ?? null : null,
      childName: anmeldung ? `${anmeldung.child_firstname} ${anmeldung.child_lastname}` : null,
    }
  })

  return { success: true, data: rows }
}

export async function processMailOutboxNow(): Promise<ActionResult<DispatchResult>> {
  const auth_ = await requireAdminSession()
  if (!auth_.authorized) return { success: false, error: auth_.error }

  try {
    const result = await dispatchDueOutboxMails()
    revalidatePath('/dashboard/mail-outbox')
    return { success: true, data: result }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unbekannter Fehler' }
  }
}
