// Punkt 1 aus design-review-todo.md (aufgelöst 2026-07-23): Alle Preise im neuen Angebotskatalog
// gelten bis auf Weiteres als vorläufig/fiktiv und werden vor dem echten Verkaufsstart angepasst.
// SHOW_PRICE_PREVIEW_BADGE steuert ausschliesslich die kosmetische Kennzeichnung (Badge,
// Hinweistext) -- NICHT die Buchbarkeit selbst. Ob ein Angebot tatsächlich buchbar ist, bleibt
// vollständig datengetrieben (lib/kurse/session-row.ts: nur mit echter SessionAvailability). Diese
// Trennung ist bewusst: Schritt 10a (Admin-Kursverwaltung) und die zugehörigen E2E-Tests
// (tests/routes.spec.ts, scripts/seed-e2e-course-fixtures.mjs) verlassen sich darauf, dass ein
// Angebot mit echten course_sessions/intensivwoche_kurse-Daten regulär buchbar wird -- ein
// pauschales, datenunabhängiges "immer disabled" würde diesen bereits funktionierenden
// End-to-End-Mechanismus brechen. Einziger Umschaltpunkt für die Badge-Anzeige; sobald reale,
// fachlich freigegebene Preise vorliegen, hier auf false setzen.
export const SHOW_PRICE_PREVIEW_BADGE = true

export const PREVIEW_DISABLED_REASON = 'Vorschau – Preise vorläufig, Anmeldung folgt'

export const PREVIEW_BOOKING_NOTE =
  'Alle Preise und Termine auf dieser Seite sind vorläufig und werden vor dem Verkaufsstart final bestätigt.'
