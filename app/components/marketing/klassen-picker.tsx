import type { Audience } from '@/types/marketing'
import { Link } from '@/i18n/navigation'

interface KlassenPickerProps {
  audiences: Audience[]
}

const categoryLabels: Record<'primar' | 'sek', string> = {
  primar: 'Primarschule',
  sek: 'Sekundarschule',
}

// Nur Startseite (Hero), 5er-Grid der schulischen Zielgruppen -- filtert placements.includes
// ("heroPicker") aus derselben Audience[]-Quelle wie SiteNav, keine zweite Datenquelle. Die zwei
// sichtbaren Gruppen (Primarschule/Sekundarschule) leiten sich aus dem bestehenden
// kategorie-Feld ab, statt eine eigene Gruppierungsliste zu pflegen.
function KlassenPicker({ audiences }: KlassenPickerProps) {
  const heroAudiences = audiences.filter((audience) => audience.placements.includes('heroPicker'))
  const groups: ('primar' | 'sek')[] = ['primar', 'sek']

  return (
    <div className="flex flex-col gap-6 rounded-xl border border-border bg-card p-6">
      <p className="text-sm font-medium text-foreground">In welcher Klasse ist Ihr Kind aktuell?</p>
      <div className="grid gap-6 sm:grid-cols-2">
        {groups.map((kategorie) => {
          const items = heroAudiences.filter((audience) => audience.kategorie === kategorie)
          if (items.length === 0) return null

          return (
            <div key={kategorie} className="flex flex-col gap-2">
              <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
                {categoryLabels[kategorie]}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {items.map((audience) => (
                  <Link
                    key={audience.id}
                    href={audience.href}
                    className="flex min-h-[44px] items-center justify-center rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    {audience.displayLabel}
                  </Link>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export { KlassenPicker }
