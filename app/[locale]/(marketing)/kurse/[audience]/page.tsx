import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import { audiences } from '@/app/data/marketing-site'
import type { AudienceHeroContent } from '@/types/marketing'
import { Section } from '@/app/components/layout/section'
import { AudienceHero } from '@/app/components/kurse/audience-hero'
import { CourseCardGrid } from '@/app/components/kurse/course-card-grid'
import { AddOnCourses } from '@/app/components/kurse/add-on-courses'
import { ExistingCourseBooking } from '@/app/components/kurse/existing-course-booking'
import {
  getAudienceHero,
  getExistingCoursesForAudience,
  getOfferCatalogForAudience,
} from '@/lib/kurse/catalog'

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    audiences.map((audience) => ({ locale, audience: audience.slug }))
  )
}

function findAudience(slug: string) {
  return audiences.find((audience) => audience.slug === slug)
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ audience: string }>
}): Promise<Metadata> {
  const { audience: audienceSlug } = await params
  const audience = findAudience(audienceSlug)
  if (!audience) return {}

  const fallbackHero: AudienceHeroContent = {
    title: audience.displayLabel,
    description: audience.zielPruefung,
  }
  const hero = await getAudienceHero(audience.id, fallbackHero)

  return { title: hero.title, description: hero.description }
}

export default async function AudienceOverviewPage({
  params,
}: {
  params: Promise<{ locale: string; audience: string }>
}) {
  const { locale, audience: audienceSlug } = await params
  setRequestLocale(locale)

  const audience = findAudience(audienceSlug)
  if (!audience) notFound()

  const fallbackHero: AudienceHeroContent = {
    title: audience.displayLabel,
    description: audience.zielPruefung,
  }

  const [hero, { offers, addOnOffers }, existingCourses] = await Promise.all([
    getAudienceHero(audience.id, fallbackHero),
    getOfferCatalogForAudience(audience.id),
    getExistingCoursesForAudience(audience.id),
  ])

  return (
    <>
      <Section spacing="lg">
        <AudienceHero content={hero} />
      </Section>

      {offers.length > 0 || addOnOffers.length > 0 ? (
        <Section variant="muted">
          <div className="flex flex-col gap-10">
            {offers.length > 0 ? <CourseCardGrid offers={offers} /> : null}
            <AddOnCourses offers={addOnOffers} />
          </div>
        </Section>
      ) : null}

      {existingCourses.length > 0 ? (
        <Section>
          <ExistingCourseBooking courses={existingCourses} />
        </Section>
      ) : null}
    </>
  )
}
