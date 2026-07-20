import type { SelfStudyOffer, UserAction } from '@/types/marketing'
import { SectionHeading } from '@/app/components/layout/section-heading'
import { Button } from '@/app/components/ui/button'
import { Link } from '@/i18n/navigation'
import { formatOfferPrice } from '@/lib/pricing'

interface SelfStudyAccessProps {
  offer: SelfStudyOffer
  accessAction: UserAction
}

// Kein Booking/Sessions bei SelfStudyOffer (Abschnitt 2.2) -- Preis, Zugangsbedingungen und CTA
// werden hier gebündelt statt über BookingSection.
function SelfStudyAccess({ offer, accessAction }: SelfStudyAccessProps) {
  const price = formatOfferPrice(offer)

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading title={offer.access.title} description={offer.access.description} level={3} />
      {offer.access.note ? <p className="text-sm text-muted-foreground">{offer.access.note}</p> : null}
      {offer.overviewBullets.length > 0 ? (
        <ul className="space-y-1.5">
          {offer.overviewBullets.map((bullet) => (
            <li
              key={bullet}
              className="flex gap-2 border-t border-border pt-1.5 text-sm text-foreground first:border-t-0 first:pt-0"
            >
              <span aria-hidden="true" className="text-secondary-foreground">
                —
              </span>
              {bullet}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex items-center justify-between gap-3 border-t border-border pt-6">
        <div>
          <p className="font-serif text-xl font-semibold text-foreground">{price.value}</p>
          {price.note ? <p className="text-sm text-muted-foreground">{price.note}</p> : null}
        </div>
        {accessAction.kind === 'link' ? (
          <Button asChild>
            <Link href={accessAction.href}>{accessAction.label}</Link>
          </Button>
        ) : (
          <Button variant="outline" disabled aria-disabled="true">
            {accessAction.label}
            <span className="sr-only"> — {accessAction.disabledReason}</span>
          </Button>
        )}
      </div>
    </div>
  )
}

export { SelfStudyAccess }
