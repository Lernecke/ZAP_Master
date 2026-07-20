// SessionDefinition (stabil/cachebar) + request-time SessionAvailability -> SessionRow
// (design-reference/architektur-briefing-kursseiten.md Abschnitt 2.4/2.9). Reine Kombinierfunktion
// -- die Verfügbarkeit selbst kommt ungecacht aus lib/kurse/availability.ts.

import type { BookingAction, SessionAvailability, SessionDefinition, SessionRow } from '@/types/marketing'

export function buildBookingAction(availability: SessionAvailability | undefined): BookingAction {
  if (availability == null) {
    return { kind: 'disabled', label: 'Anmelden', disabledReason: 'Keine Anmeldung möglich' }
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
