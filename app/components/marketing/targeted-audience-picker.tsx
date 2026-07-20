import type { Audience } from '@/types/marketing'
import { Link } from '@/i18n/navigation'

interface TargetedAudiencePickerOption {
  audience: Audience
  href: string
}

interface TargetedAudiencePickerProps {
  options: TargetedAudiencePickerOption[]
}

// Generischer 2(+)-Optionen-Picker für zielgruppenspezifische Zusatzangebote (Distance Learning
// heute, Prüfungssimulations-Landingpage in Schritt 11 mit anderen Zielen) -- der Caller liefert
// bereits fertige hrefs, keine kurstyp-spezifische Href-Logik im Component.
function TargetedAudiencePicker({ options }: TargetedAudiencePickerProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {options.map(({ audience, href }) => (
        <Link
          key={audience.id}
          href={href}
          className="flex flex-col gap-1 rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary"
        >
          <span className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
            {audience.kategorie === 'primar' ? 'Primarschule' : 'Sekundarschule'}
          </span>
          <span className="font-serif text-lg font-semibold text-foreground">
            {audience.displayLabel}
          </span>
        </Link>
      ))}
    </div>
  )
}

export { TargetedAudiencePicker }
