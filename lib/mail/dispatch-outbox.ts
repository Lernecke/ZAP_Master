import { createAdminSupabaseClient } from "@/lib/supabase/server"
import { getResendClient, getMailFromAddress } from "@/lib/mail/resend-client"
import { renderBookingConfirmation } from "@/lib/mail/templates/booking-confirmation"
import type { Fach } from "@/types/kurs"

// Abschnitt 10.4 (E-Mail-Outbox): "Bestätigungsmails laufen idempotent über Outbox/Retry ... und
// machen dauerhafte Zustellfehler im Admin sichtbar." Diese Datei ist der einzige Ort, der
// tatsächlich per Resend versendet -- sowohl der Best-Effort-Versuch direkt nach einer Buchung
// (app/(public)/kurse/actions.ts) als auch der secret-geschützte HTTP-Endpunkt
// (app/api/mail-outbox/process/route.ts) und der manuelle Admin-Button rufen dieselbe Funktion auf.
//
// Exponentielles Backoff (Minuten): 1, 5, 25, 125, 625 -- bei max_attempts=5 (Tabellen-Default)
// deckt das gut zwei Stunden verteilter Versuche ab, bevor eine Zeile als "failed" im Admin
// auftaucht.
const BACKOFF_MINUTES = [1, 5, 25, 125, 625]

export interface DispatchResult {
  processed: number
  sent: number
  failed: number
  stillPending: number
}

interface OutboxRowWithContext {
  id: string
  anmeldung_id: string
  template_key: string
  attempts: number
  max_attempts: number
}

/**
 * Verarbeitet alle faelligen mail_outbox-Zeilen (status='pending' oder 'failed' mit
 * attempts < max_attempts und next_attempt_at <= now()). service_role, server-only.
 */
export async function dispatchDueOutboxMails(limit = 25): Promise<DispatchResult> {
  const supabase = createAdminSupabaseClient()

  const { data: rows, error: fetchError } = await supabase
    .from("mail_outbox")
    .select("id, anmeldung_id, template_key, attempts, max_attempts")
    .in("status", ["pending", "failed"])
    .lte("next_attempt_at", new Date().toISOString())
    .order("created_at", { ascending: true })
    .limit(limit)

  if (fetchError) {
    throw new Error(`mail_outbox konnte nicht gelesen werden: ${fetchError.message}`)
  }

  // attempts < max_attempts kann der Query-Builder nicht spaltenuebergreifend ausdruecken
  // (PostgREST-Filter vergleichen nur gegen Literale) -- deshalb hier client-seitig gefiltert.
  const dueRows = (rows ?? []).filter((row) => row.attempts < row.max_attempts)

  const result: DispatchResult = { processed: 0, sent: 0, failed: 0, stillPending: 0 }

  for (const row of dueRows as OutboxRowWithContext[]) {
    result.processed++
    const outcome = await dispatchSingleRow(supabase, row)
    if (outcome === "sent") result.sent++
    else if (outcome === "failed") result.failed++
    else result.stillPending++
  }

  return result
}

/** Verarbeitet genau eine Anmeldung (Best-Effort-Versand direkt nach erfolgreicher Buchung). */
export async function dispatchOutboxForAnmeldung(anmeldungId: string): Promise<void> {
  const supabase = createAdminSupabaseClient()

  const { data: row, error } = await supabase
    .from("mail_outbox")
    .select("id, anmeldung_id, template_key, attempts, max_attempts")
    .eq("anmeldung_id", anmeldungId)
    .eq("template_key", "booking_confirmation")
    .eq("status", "pending")
    .maybeSingle()

  // Kein Fehler nach aussen werfen: der Trigger hat die Zeile bereits angelegt (Quelle der
  // Wahrheit), ein fehlgeschlagener Best-Effort-Versuch hier wird spaeter per Retry nachgeholt.
  if (error || !row) return

  await dispatchSingleRow(supabase, row)
}

async function dispatchSingleRow(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  row: OutboxRowWithContext
): Promise<"sent" | "failed" | "pending"> {
  const context = await loadAnmeldungContext(supabase, row.anmeldung_id)
  if (!context) {
    // Anmeldung existiert nicht (mehr) -- kann bei kaskadiertem Löschen vorkommen. Als endgültig
    // fehlgeschlagen markieren, kein sinnvoller Retry möglich.
    await supabase
      .from("mail_outbox")
      .update({
        status: "failed",
        attempts: row.max_attempts,
        last_error: "Zugehörige Anmeldung nicht gefunden.",
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id)
    return "failed"
  }

  try {
    const mail = renderBookingConfirmation(context)
    const resend = getResendClient()
    const { data, error } = await resend.emails.send({
      from: getMailFromAddress(),
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    })

    if (error) throw new Error(error.message)

    await supabase
      .from("mail_outbox")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        provider_message_id: data?.id ?? null,
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id)
    return "sent"
  } catch (err) {
    const attempts = row.attempts + 1
    const isFinal = attempts >= row.max_attempts
    const backoffMinutes = BACKOFF_MINUTES[Math.min(attempts - 1, BACKOFF_MINUTES.length - 1)]
    const nextAttemptAt = new Date(Date.now() + backoffMinutes * 60_000)

    await supabase
      .from("mail_outbox")
      .update({
        status: "failed",
        attempts,
        last_error: err instanceof Error ? err.message : "Unbekannter Fehler beim Mailversand",
        next_attempt_at: nextAttemptAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id)
    return isFinal ? "failed" : "pending"
  }
}

async function loadAnmeldungContext(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  anmeldungId: string
) {
  const { data: anmeldung, error: anmeldungError } = await supabase
    .from("intensivwoche_anmeldungen")
    .select("child_firstname, child_lastname, parent_email, kurs_id, booked_price_rappen, currency")
    .eq("id", anmeldungId)
    .single()

  if (anmeldungError || anmeldung?.kurs_id == null) return null

  const { data: kurs, error: kursError } = await supabase
    .from("intensivwoche_kurse")
    .select("name, fach, start_datum, end_datum, uhrzeit, ort")
    .eq("id", anmeldung.kurs_id)
    .single()

  if (kursError || !kurs) return null

  return {
    parentEmail: anmeldung.parent_email,
    childFirstname: anmeldung.child_firstname,
    childLastname: anmeldung.child_lastname,
    kursName: kurs.name,
    fach: kurs.fach as Fach,
    startDatum: kurs.start_datum,
    endDatum: kurs.end_datum,
    uhrzeit: kurs.uhrzeit,
    ort: kurs.ort,
    bookedPriceRappen: anmeldung.booked_price_rappen,
    currency: anmeldung.currency,
  }
}
