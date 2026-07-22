import { FACH_LABELS, type Fach } from "@/types/kurs"
import { formatChfRappen } from "@/lib/pricing"

// PII-minimal per Abschnitt 10.4 ("keine unnötigen personenbezogenen Daten"): enthaelt nur, was
// fuer eine Buchungsbestaetigung tatsaechlich noetig ist (Kindname, Kurs, Termin, Preis). Explizit
// AUSGESCHLOSSEN: parent_phone, notes (potenziell sensibel, z. B. "Allergien, besondere
// Beduerfnisse") und jedes Feld, das nicht direkt der Bestaetigung dient.
export interface BookingConfirmationData {
  parentEmail: string
  childFirstname: string
  childLastname: string
  kursName: string
  fach: Fach
  startDatum: string
  endDatum: string
  uhrzeit: string
  ort: string
  bookedPriceRappen: number | null
  currency: string
}

export interface RenderedMail {
  to: string
  subject: string
  text: string
  html: string
}

function formatDatum(datum: string): string {
  return new Date(datum).toLocaleDateString("de-CH", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export function renderBookingConfirmation(data: BookingConfirmationData): RenderedMail {
  const fachLabel = FACH_LABELS[data.fach] ?? data.fach
  const zeitraum = `${formatDatum(data.startDatum)} – ${formatDatum(data.endDatum)}`
  const preisZeile =
    data.bookedPriceRappen != null && data.currency === "CHF"
      ? formatChfRappen(data.bookedPriceRappen)
      : null

  const subject = `Anmeldebestätigung: ${data.kursName}`

  const lines = [
    `Hallo,`,
    ``,
    `vielen Dank für die Anmeldung von ${data.childFirstname} ${data.childLastname} zu folgendem Kurs:`,
    ``,
    `Kurs: ${data.kursName} (${fachLabel})`,
    `Zeitraum: ${zeitraum}`,
    `Zeit: ${data.uhrzeit}`,
    `Ort: ${data.ort}`,
    ...(preisZeile ? [`Preis: ${preisZeile}`] : []),
    ``,
    `Wir freuen uns auf die Teilnahme! Bei Fragen kannst du dich jederzeit bei uns melden.`,
    ``,
    `Beste Grüsse`,
  ]
  const text = lines.join("\n")

  const html = `<!doctype html>
<html lang="de">
<body style="font-family: sans-serif; color: #16233F; max-width: 480px; margin: 0 auto; padding: 24px;">
  <h1 style="font-size: 20px;">Anmeldebestätigung</h1>
  <p>Hallo,</p>
  <p>vielen Dank für die Anmeldung von <strong>${escapeHtml(data.childFirstname)} ${escapeHtml(data.childLastname)}</strong> zu folgendem Kurs:</p>
  <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
    <tbody>
      <tr><td style="padding: 4px 0; color: #3C4A68;">Kurs</td><td style="padding: 4px 0;">${escapeHtml(data.kursName)} (${escapeHtml(fachLabel)})</td></tr>
      <tr><td style="padding: 4px 0; color: #3C4A68;">Zeitraum</td><td style="padding: 4px 0;">${escapeHtml(zeitraum)}</td></tr>
      <tr><td style="padding: 4px 0; color: #3C4A68;">Zeit</td><td style="padding: 4px 0;">${escapeHtml(data.uhrzeit)}</td></tr>
      <tr><td style="padding: 4px 0; color: #3C4A68;">Ort</td><td style="padding: 4px 0;">${escapeHtml(data.ort)}</td></tr>
      ${preisZeile ? `<tr><td style="padding: 4px 0; color: #3C4A68;">Preis</td><td style="padding: 4px 0;">${escapeHtml(preisZeile)}</td></tr>` : ""}
    </tbody>
  </table>
  <p>Wir freuen uns auf die Teilnahme! Bei Fragen kannst du dich jederzeit bei uns melden.</p>
  <p>Beste Grüsse</p>
</body>
</html>`

  return { to: data.parentEmail, subject, text, html }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
