import { Resend } from "resend"

// Abschnitt 10.4 (E-Mail-Outbox). Server-only, lazy: ein fehlender RESEND_API_KEY in einer lokalen
// Entwicklungsumgebung ohne Mail-Anbindung darf nicht den gesamten Prozessstart zum Absturz
// bringen -- der Fehler soll erst auftreten, wenn tatsächlich versucht wird, eine Mail zu senden
// (lib/mail/dispatch-outbox.ts faengt ihn ab und markiert die betroffene mail_outbox-Zeile als
// fehlgeschlagen, statt den ganzen Buchungsvorgang zu unterbrechen).

let cachedClient: Resend | null = null

export function getResendClient(): Resend {
  if (cachedClient) return cachedClient

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY ist nicht gesetzt. Siehe .env.example und mail-outbox-runbook.md."
    )
  }

  cachedClient = new Resend(apiKey)
  return cachedClient
}

/** Absenderadresse fuer alle Outbox-Mails. Ein Platzhalter, bis eine echte Domain verifiziert ist. */
export function getMailFromAddress(): string {
  return process.env.MAIL_FROM_ADDRESS ?? "noreply@example.ch"
}
