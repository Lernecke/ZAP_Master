import Link from 'next/link'
import type { CourseOffer } from '@/types/marketing'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { StatusBadge } from '@/app/components/kurse/status-badge'
import { CategoryBadge } from '@/app/components/kurse/category-badge'
import { formatOfferPrice } from '@/lib/pricing'

interface CourseCardProps {
  offer: CourseOffer
}

function CourseCard({ offer }: CourseCardProps) {
  const price = formatOfferPrice(offer)

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          {offer.recommended ? <StatusBadge status="empfohlen" /> : null}
          {offer.categoryLabel ? (
            <CategoryBadge label={offer.categoryLabel} subject={offer.subject} />
          ) : null}
        </div>
        <CardTitle className="font-serif text-xl">{offer.displayName}</CardTitle>
        <CardDescription>{offer.tagline}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        {offer.dateSummary.length > 0 ? (
          <p className="text-sm font-medium text-foreground">{offer.dateSummary.join(' · ')}</p>
        ) : null}
        <p className="text-sm text-muted-foreground">{offer.description}</p>
        {offer.features.length > 0 ? (
          <ul className="mt-auto space-y-1.5">
            {offer.features.map((feature) => (
              <li
                key={feature}
                className="flex gap-2 border-t border-border pt-1.5 text-sm text-foreground first:border-t-0 first:pt-0"
              >
                <span aria-hidden="true" className="text-secondary-foreground">
                  —
                </span>
                {feature}
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
      <CardFooter className="flex items-end justify-between gap-3 border-t pt-6">
        <div>
          <p className="font-serif text-xl font-semibold text-foreground">{price.value}</p>
          {price.note ? <p className="text-xs text-muted-foreground">{price.note}</p> : null}
        </div>
        <Button asChild>
          <Link href={offer.href}>Termine ansehen</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

export { CourseCard }
