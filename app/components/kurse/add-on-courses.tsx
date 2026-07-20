import { Link } from '@/i18n/navigation'
import type { ExamSimulationOffer, SelfStudyOffer } from '@/types/marketing'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { ResponsiveGrid } from '@/app/components/layout/responsive-grid'
import { formatOfferPrice } from '@/lib/pricing'

interface AddOnCoursesProps {
  offers: (ExamSimulationOffer | SelfStudyOffer)[]
}

// Rendert nichts bei leerer Liste -- der Mapper liefert AddOnOffers nur für Zielgruppen mit
// passender Capability (Abschnitt 2.5), keine Sonderfall-Logik hier im Component.
function AddOnCourses({ offers }: AddOnCoursesProps) {
  if (offers.length === 0) return null

  return (
    <ResponsiveGrid columns={{ base: 1, md: 2 }} gap="sm">
      {offers.map((offer) => {
        const price = formatOfferPrice(offer)

        return (
          <Card key={offer.id}>
            <CardHeader>
              <CardTitle className="font-serif text-lg">{offer.displayName}</CardTitle>
              <CardDescription>{offer.tagline}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{offer.description}</p>
            </CardContent>
            <CardFooter className="flex items-end justify-between gap-3 border-t pt-4">
              <div>
                <p className="font-serif text-base font-semibold text-foreground">{price.value}</p>
                {price.note ? <p className="text-xs text-muted-foreground">{price.note}</p> : null}
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href={offer.href}>Mehr erfahren</Link>
              </Button>
            </CardFooter>
          </Card>
        )
      })}
    </ResponsiveGrid>
  )
}

export { AddOnCourses }
