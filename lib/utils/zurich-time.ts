// Konvertiert zwischen den zeitzonenlosen Strings aus <input type="datetime-local"> (z.B.
// "2026-08-01T09:00") und korrekten UTC-ISO-Timestamps für Europe/Zurich (CET/CEST).
//
// `new Date("2026-08-01T09:00")` bzw. das direkte Speichern eines solchen Strings in einer
// `timestamptz`-Spalte ist dafür NICHT sicher: ein Timestamp-String ohne Offset wird laut
// ECMAScript-Spec in der Zeitzone der ausführenden Runtime interpretiert (bei Postgres: in der
// Session-`timezone`, standardmässig UTC), nicht in der Zeitzone der Admin-Person, die den Wert
// im Browser eingegeben hat. Ohne diese Konvertierung verschiebt sich jede eingegebene Uhrzeit
// je nach Sommer-/Winterzeit um 1-2 Stunden.
//
// Bekannte Grenze: die eine Stunde, die beim Wechsel auf Sommerzeit übersprungen wird (z.B.
// 2026-03-29, 02:00-03:00 existiert in Europe/Zurich nicht), hat keine eindeutige UTC-Entsprechung.
// Für ein Termin-/Freigabe-Verwaltungstool ist das kein praktisches Risiko.
const ZURICH_TZ = 'Europe/Zurich'

function getPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((p) => p.type === type)?.value ?? '00'
}

/**
 * Interpretiert einen `datetime-local`-Wert als Europe/Zurich-Wandzeit und liefert den
 * entsprechenden UTC-ISO-Timestamp. Zum Schreiben in `timestamptz`-Spalten/RPC-Parameter.
 */
export function zurichLocalToUtcIso(datetimeLocal: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(datetimeLocal)
  if (!match) {
    throw new Error(`Ungültiges datetime-local Format: ${datetimeLocal}`)
  }
  const [, yearStr, monthStr, dayStr, hourStr, minuteStr] = match
  const year = Number(yearStr)
  const month = Number(monthStr)
  const day = Number(dayStr)
  const hour = Number(hourStr)
  const minute = Number(minuteStr)

  // Erster Versuch: die eingegebenen Feldwerte testweise als UTC behandeln.
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute)

  // Herausfinden, wie dieser UTC-Zeitpunkt in Europe/Zurich aussieht (CET=+1 oder CEST=+2, je
  // nach Datum) -- die Differenz zur gewünschten Wandzeit ist der anzuwendende Offset.
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: ZURICH_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = formatter.formatToParts(new Date(utcGuess))
  // Manche Intl-Implementierungen liefern für Mitternacht "24" statt "00".
  const zurichHour = Number(getPart(parts, 'hour')) % 24
  const zurichAsUtc = Date.UTC(
    Number(getPart(parts, 'year')),
    Number(getPart(parts, 'month')) - 1,
    Number(getPart(parts, 'day')),
    zurichHour,
    Number(getPart(parts, 'minute'))
  )

  const offsetMs = zurichAsUtc - utcGuess
  return new Date(utcGuess - offsetMs).toISOString()
}

/**
 * Kehrt zurichLocalToUtcIso() um: formatiert einen gespeicherten UTC-ISO-Timestamp als
 * Europe/Zurich-Wandzeit im <input type="datetime-local">-Format ("YYYY-MM-DDTHH:mm"). Zum
 * Vorbefüllen von Bearbeitungsformularen -- ein reines `.slice(0, 16)` des UTC-Strings würde die
 * UTC-Ziffern unverändert als Zürcher Ortszeit anzeigen und damit um 1-2 Stunden danebenliegen.
 */
export function utcIsoToZurichLocal(utcIso: string): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: ZURICH_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = formatter.formatToParts(new Date(utcIso))
  const hour = getPart(parts, 'hour') === '24' ? '00' : getPart(parts, 'hour')
  return `${getPart(parts, 'year')}-${getPart(parts, 'month')}-${getPart(parts, 'day')}T${hour}:${getPart(parts, 'minute')}`
}
