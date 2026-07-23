// SessionDefinition (stabil/cachebar) + request-time SessionAvailability -> SessionRow
// (design-reference/architektur-briefing-kursseiten.md Abschnitt 2.4/2.9). Reine Kombinierfunktion
// -- die Verfügbarkeit selbst kommt ungecacht aus lib/kurse/availability.ts.

import type { BookingAction, SessionAvailability, SessionDefinition, SessionRow } from '@/types/marketing'
import { PREVIEW_DISABLED_REASON } from '@/lib/kurse/pricing-status'

// Punkt 1 aus design-review-todo.md (2026-07-23): Die Vorschau-Kennzeichnung ist bewusst nur
// kosmetisch (Badge/Hinweistext, siehe lib/kurse/pricing-status.ts) und überschreibt NICHT diese
// datengetriebene Logik. Grund: Schritt 10a (Admin-Kursverwaltung) legt über echte
// course_sessions/intensivwoche_kurse-Zeilen genau denselben Rendering-Pfad bewusst wieder buchbar
// an, sobald reale Daten existieren -- getestet in tests/routes.spec.ts ("Kurs B",
// scripts/seed-e2e-course-fixtures.mjs). Ein pauschales, datenunabhängiges disabled würde diesen
// bereits funktionierenden End-to-End-Mechanismus brechen. Solange die aktuellen
// Katalog-Fixtures keine echten Sessions besitzen, bleibt availability hier ohnehin `undefined`
// und der Button entsprechend deaktiviert -- ganz ohne Sonderfall.
export function buildBookingAction(availability: SessionAvailability | undefined): BookingAction {
  if (availability == null) {
    return { kind: 'disabled', label: 'Anmelden', disabledReason: PREVIEW_DISABLED_REASON }
  }
  if (availability.status === 'voll') {
    return { kind: 'disabled', label: 'Anmelden', disabledReason: 'Ausgebucht' }
  }
  return { kind: 'modal', label: 'Anmelden' }
}

export function buildSessionRows(
  sessions: SessionDefinition[],
  availabilityByKursId: Map<number, SessionAvailability>
): SessionRow[] {
  return sessions.map((session) => {
    const availability = availabilityByKursId.get(session.source.kursId)
    return {
      ...session,
      availability:
        availability ?? {
          status: 'voll',
          bookedCount: 0,
          remainingPlaces: 0,
          updatedAt: new Date().toISOString(),
        },
      bookingAction: buildBookingAction(availability),
    }
  })
}
