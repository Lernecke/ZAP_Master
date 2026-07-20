import type { Audience, ServiceCardModel } from '@/types/marketing'
import { Link } from '@/i18n/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'

interface ServiceCardProps {
  service: ServiceCardModel
  /** Nur zur Auflösung von navLabel-Texten für den eligibleFor-Hinweis -- keine zweite
   *  Zielgruppenliste, derselbe Audience[]-Datensatz wie SiteNav/KlassenPicker. */
  audiences?: Audience[]
}

// Ganze Karte klickbar über service.action; eligibleFor rendert einen Hinweis nur, wenn er nicht
// bereits alle sieben Zielgruppen abdeckt (allgemeine Regel, nicht auf eine Karte hartcodiert).
function ServiceCard({ service, audiences = [] }: ServiceCardProps) {
  const eligibleLabels =
    service.eligibleFor && service.eligibleFor.length < 7
      ? service.eligibleFor
          .map((id) => audiences.find((audience) => audience.id === id)?.navLabel)
          .filter((label): label is string => Boolean(label))
      : []

  return (
    <Link href={service.action.href} aria-label={service.action.ariaLabel} className="block h-full">
      <Card className="h-full transition-colors hover:border-primary">
        <CardHeader>
          <CardTitle className="font-serif text-lg">{service.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">{service.description}</p>
          {eligibleLabels.length > 0 ? (
            <p className="font-mono text-xs text-secondary-foreground">
              Verfügbar für {eligibleLabels.join(' & ')}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </Link>
  )
}

export { ServiceCard }
