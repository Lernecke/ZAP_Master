'use client'

import { useMemo, useState } from 'react'
import type { CourseOffer, SessionColumn, SessionRow } from '@/types/marketing'
import { SectionHeading } from '@/app/components/layout/section-heading'
import { SessionTable } from '@/app/components/kurse/session-table'
import { WeekFilter, ALL_WEEKS_ID } from '@/app/components/kurse/week-filter'

interface BookingSectionProps {
  offer: CourseOffer
  sessions: SessionRow[]
  onBook?: (row: SessionRow) => void
}

// Spalten sind stabile Konfiguration, nicht redaktionell frei wählbar (Abschnitt 2.4) -- die
// Zuordnung passiert hier anhand offer.kurstyp, kein caller-seitiger columns-Prop nötig.
const intensivkursColumns: SessionColumn[] = [
  { key: 'kurs', label: 'Kurs' },
  { key: 'date', label: 'Datum' },
  { key: 'time', label: 'Zeit' },
  { key: 'details', label: 'Tagesplan' },
  { key: 'location', label: 'Standort' },
  { key: 'status', label: 'Status' },
]

const halbjahreskursColumns: SessionColumn[] = [
  { key: 'kurs', label: 'Kurs' },
  { key: 'time', label: 'Tag & Zeit' },
  { key: 'details', label: 'Ablauf' },
  { key: 'location', label: 'Standort' },
  { key: 'status', label: 'Status' },
]

function BookingSection({ offer, sessions, onBook }: BookingSectionProps) {
  const [activeWeekId, setActiveWeekId] = useState(ALL_WEEKS_ID)

  const columns = offer.kurstyp === 'halbjahreskurs' ? halbjahreskursColumns : intensivkursColumns

  const visibleSessions = useMemo(() => {
    if (!offer.weekOptions || activeWeekId === ALL_WEEKS_ID) return sessions
    return sessions.filter((session) => session.weekId === activeWeekId)
  }, [sessions, offer.weekOptions, activeWeekId])

  return (
    <div id={offer.booking.anchorId} className="flex flex-col gap-6">
      <SectionHeading title={offer.booking.title} description={offer.booking.description} level={3} />
      {offer.weekOptions ? (
        <WeekFilter weeks={offer.weekOptions} activeWeekId={activeWeekId} onChange={setActiveWeekId} />
      ) : null}
      {visibleSessions.length > 0 ? (
        <SessionTable columns={columns} rows={visibleSessions} onBook={onBook} />
      ) : (
        <p className="text-sm text-muted-foreground">{offer.booking.emptyState}</p>
      )}
      {offer.booking.note ? <p className="text-xs text-muted-foreground">{offer.booking.note}</p> : null}
    </div>
  )
}

export { BookingSection }
