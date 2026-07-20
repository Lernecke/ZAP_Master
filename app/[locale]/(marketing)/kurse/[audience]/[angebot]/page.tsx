import type { Metadata } from 'next'
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { setRequestLocale } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import { audiences } from '@/app/data/marketing-site'
import type { CourseOffer, ExamSimulationOffer, SessionDefinition } from '@/types/marketing'
import { Section } from '@/app/components/layout/section'
import { CourseHero } from '@/app/components/kurse/course-hero'
import { CourseFlow } from '@/app/components/kurse/course-flow'
import { CourseContent } from '@/app/components/kurse/course-content'
import { WhyUsGrid } from '@/app/components/kurse/why-us-grid'
import { Testimonials } from '@/app/components/kurse/testimonials'
import { ExamSimTimeline } from '@/app/components/kurse/exam-sim-timeline'
import { FaqAccordion } from '@/app/components/marketing/faq-accordion'
import { BookingSectionWithModal } from '@/app/components/kurse/booking-section-with-modal'
import { getOfferBySlug, getSessionsForOffer } from '@/lib/kurse/catalog'
import { getSessionAvailability } from '@/lib/kurse/availability'
import { buildSessionRows } from '@/lib/kurse/session-row'
import { listCatalogedOfferParams } from '@/lib/kurse/offer-catalog'

type BookableOffer = CourseOffer | ExamSimulationOffer

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    listCatalogedOfferParams().map(({ audience, angebot }) => ({ locale, audience, angebot }))
  )
}

/** CourseOffer (halbjahreskurs/intensivkurs) und ExamSimulationOffer (pruefungssimulation) haben
 *  eine Detailseiten-Vorlage; SelfStudyOffer noch nicht -- siehe Kommentar in
 *  lib/kurse/offer-catalog.ts. */
async function resolveBookableOffer(audienceSlug: string, offerSlug: string): Promise<BookableOffer | null> {
  const audience = audiences.find((a) => a.slug === audienceSlug)
  if (!audience) return null

  const offer = await getOfferBySlug(audience.id, offerSlug)
  if (
    offer == null ||
    (offer.kurstyp !== 'halbjahreskurs' &&
      offer.kurstyp !== 'intensivkurs' &&
      offer.kurstyp !== 'pruefungssimulation')
  ) {
    return null
  }
  return offer
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ audience: string; angebot: string }>
}): Promise<Metadata> {
  const { audience, angebot } = await params
  const offer = await resolveBookableOffer(audience, angebot)
  if (!offer) return {}
  return { title: offer.displayName, description: offer.tagline }
}

function SessionTableSkeleton() {
  return (
    <div className="h-48 w-full animate-pulse rounded-xl border border-border bg-muted/40" />
  )
}

async function BookingSectionLoader({
  offer,
  sessions,
}: {
  offer: BookableOffer
  sessions: SessionDefinition[]
}) {
  await connection()
  const availability = await getSessionAvailability(sessions.map((session) => session.source.kursId))
  const rows = buildSessionRows(sessions, availability)
  return <BookingSectionWithModal offer={offer} sessions={rows} />
}

export default async function CourseOfferDetailPage({
  params,
}: {
  params: Promise<{ locale: string; audience: string; angebot: string }>
}) {
  const { locale, audience: audienceSlug, angebot } = await params
  setRequestLocale(locale)

  const offer = await resolveBookableOffer(audienceSlug, angebot)
  if (!offer) notFound()

  const sessions = await getSessionsForOffer(offer.id)
  const isExamSimulation = offer.kurstyp === 'pruefungssimulation'

  return (
    <>
      <Section spacing="lg">
        <CourseHero offer={offer} />
      </Section>

      {offer.flowSteps.length > 0 ? (
        <Section variant="muted">
          <CourseFlow steps={offer.flowSteps} />
        </Section>
      ) : null}

      {isExamSimulation && offer.examTimeline.length > 0 ? (
        <Section>
          <ExamSimTimeline segments={offer.examTimeline} />
        </Section>
      ) : null}

      {isExamSimulation && offer.faq.length > 0 ? (
        <Section variant="muted">
          <FaqAccordion items={offer.faq} />
        </Section>
      ) : null}

      {!isExamSimulation && offer.contentSections.length > 0 ? (
        <Section>
          <CourseContent sections={offer.contentSections} />
        </Section>
      ) : null}

      {offer.whyUs.length > 0 ? (
        <Section variant="muted">
          <WhyUsGrid features={offer.whyUs} />
        </Section>
      ) : null}

      {offer.testimonials && offer.testimonials.length > 0 ? (
        <Section>
          <Testimonials testimonials={offer.testimonials} />
        </Section>
      ) : null}

      <Section variant="muted">
        <Suspense fallback={<SessionTableSkeleton />}>
          <BookingSectionLoader offer={offer} sessions={sessions} />
        </Suspense>
      </Section>
    </>
  )
}
