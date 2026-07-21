// Schritt 10b: "Kurstage"-Panel aus Layout_Admin_Tagesfreigaben.html. Der Status-Punkt liest den
// tatsaechlichen daily_releases-Status (nicht nur einen lokalen UI-State wie im Mockup).

import type { CourseDayDB, DailyReleaseStatus } from '@/types/kurs-tagesfreigabe'

const WEEKDAY_LABELS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']

function formatDay(dateStr: string): { weekday: string; dateLabel: string } {
  const date = new Date(dateStr + 'T00:00:00Z')
  return {
    weekday: WEEKDAY_LABELS[date.getUTCDay()],
    dateLabel: date.toLocaleDateString('de-CH', { day: '2-digit', month: 'long', timeZone: 'UTC' }),
  }
}

function dotClass(status: DailyReleaseStatus | 'empty'): string {
  if (status === 'active') return 'bg-secondary'
  if (status === 'scheduled' || status === 'draft') return 'bg-accent'
  return 'bg-muted-foreground/30'
}

export function CourseDayPicker({
  days,
  activeDayId,
  statusByDayId,
  onSelect,
}: {
  days: CourseDayDB[]
  activeDayId: string | null
  statusByDayId: Record<string, DailyReleaseStatus | 'empty'>
  onSelect: (dayId: string) => void
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div>
        <h2 className="text-base font-semibold text-foreground">Kurstage</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Tag auswählen und vorbereiten</p>
      </div>
      <div className="space-y-2">
        {days.map((day) => {
          const { weekday, dateLabel } = formatDay(day.course_date)
          const status = statusByDayId[day.id] ?? 'empty'
          return (
            <button
              key={day.id}
              type="button"
              onClick={() => onSelect(day.id)}
              className={`w-full border rounded-xl p-3 text-left grid grid-cols-[auto_1fr_auto] gap-2.5 items-center transition-colors ${
                day.id === activeDayId ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              }`}
            >
              <span className="w-6 h-6 rounded-md bg-muted grid place-items-center text-[10px] font-mono">
                {String(day.sequence).padStart(2, '0')}
              </span>
              <span>
                <strong className="block text-sm text-foreground">{weekday}</strong>
                <small className="text-xs text-muted-foreground">{dateLabel}</small>
              </span>
              <span className={`w-2.5 h-2.5 rounded-full ${dotClass(status)}`} title={status} />
            </button>
          )
        })}
      </div>
      <div className="pt-3 border-t border-border space-y-1.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-secondary" /> Freigegeben
        </span>
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent" /> Entwurf oder geplant
        </span>
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-muted-foreground/30" /> Nicht vorbereitet
        </span>
      </div>
    </section>
  )
}
