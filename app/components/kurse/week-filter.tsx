import type { WeekOption } from '@/types/marketing'
import { ToggleGroup, ToggleGroupItem } from '@/app/components/ui/toggle-group'

interface WeekFilterProps {
  weeks: WeekOption[]
  activeWeekId: string
  onChange: (id: string) => void
}

const ALL_WEEKS_ID = 'all'

// Abschnitt 1b: Wochenfilter -> ToggleGroup, einzelne Auswahl. Nur bei Intensivkursen mit
// tatsächlich filterbaren Terminen (offer.weekOptions) gerendert -- siehe BookingSection.
function WeekFilter({ weeks, activeWeekId, onChange }: WeekFilterProps) {
  return (
    <ToggleGroup
      type="single"
      value={activeWeekId}
      onValueChange={(value) => {
        if (value) onChange(value)
      }}
      variant="outline"
      className="flex-wrap justify-start"
    >
      <ToggleGroupItem value={ALL_WEEKS_ID}>Alle Kurswochen</ToggleGroupItem>
      {weeks.map((week) => (
        <ToggleGroupItem key={week.id} value={week.id}>
          {week.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

export { WeekFilter, ALL_WEEKS_ID }
