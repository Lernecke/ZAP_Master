import type { CourseOffer, ExamSimulationOffer } from '@/types/marketing'
import { PageIntro } from '@/app/components/layout/page-intro'
import { StatusBadge } from '@/app/components/kurse/status-badge'
import { formatOfferPrice } from '@/lib/pricing'
import { SHOW_PRICE_PREVIEW_BADGE } from '@/lib/kurse/pricing-status'

interface CourseHeroProps {
  // ExamSimulationOffer teilt alle hier gelesenen Felder mit CourseOffer (Schritt 11) --
  // SelfStudyOffer bewusst ausgeschlossen (kein booking-Preis in derselben Form).
  offer: CourseOffer | ExamSimulationOffer
}

function CourseHero({ offer }: CourseHeroProps) {
  const price = formatOfferPrice(offer)

  return (
    <div className="flex flex-col gap-4">
      <PageIntro
        eyebrow={offer.recommended ? undefined : offer.categoryLabel}
        title={offer.displayName}
        description={offer.lede}
      />
      <div className="flex flex-wrap items-center gap-3">
        {offer.recommended ? <StatusBadge status="empfohlen" /> : null}
        {SHOW_PRICE_PREVIEW_BADGE ? <StatusBadge status="vorschau" /> : null}
        <p className="font-serif text-2xl font-semibold text-foreground">{price.value}</p>
        {price.note ? <p className="text-sm text-muted-foreground">{price.note}</p> : null}
      </div>
    </div>
  )
}

export { CourseHero }
