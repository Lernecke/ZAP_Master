import type { Metadata } from 'next'
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { setRequestLocale } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import { audiences } from '@/app/data/marketing-site'
import type { CourseOffer, ExamSimulationOffer, SelfStudyOffer, SessionDefinition } from '@/types/marketing'
import { Section } from '@/app/components/layout/section'
import { CourseHero } from '@/app/components/kurse/course-hero'
import { CourseFlow } from '@/app/components/kurse/course-flow'
import { CourseContent } from '@/app/components/kurse/course-content'
import { WhyUsGrid } from '@/app/components/kurse/why-us-grid'
import { Testimonials } from '@/app/components/kurse/testimonials'
import { ExamSimTimeline } from '@/app/components/kurse/exam-sim-timeline'
import { FaqAccordion } from '@/app/components/marketing/faq-accordion'
import { AudienceHero } from '@/app/components/kurse/audience-hero'
import { SelfStudyAccess } from '@/app/components/kurse/self-study-access'
import { BookingSectionWithModal } from '@/app/components/kurse/booking-section-with-modal'
import { getOfferBySlug, getSessionsForOffer } from '@/lib/kurse/catalog'
import { getSessionAvailability } from '@/lib/kurse/availability'
import { buildSessionRows } from '@/lib/kurse/session-row'
import { listCatalogedOfferParams, getSelfStudyPageExtras } from '@/lib/kurse/offer-catalog'

type BookableOffer = CourseOffer | ExamSimulationOffer

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    listCatalogedOfferParams().map(({ audience, angebot }) => ({ locale, audience, angebot }))
  )
}

// Hinweis (Schritt 12, Verifikations-Gate): `dynamicParams = false` ist inkompatibel mit
// `nextConfig.cacheComponents`, siehe ausführliche Begründung bei [audience]/page.tsx. Gleiche
// bekannte, dokumentierte Einschränkung gilt hier: der HTTP-Status einer unbekannten
// Angebotskombination kann unter PPR 200 bleiben, obwohl die 404-UI korrekt gerendert wird.

/** CourseOffer (halbjahreskurs/intensivkurs) und ExamSimulationOffer (pruefungssimulation) teilen
 *  denselben Buchungs-Rendering-Pfad (Hero/Flow/Content/Booking). SelfStudyOffer hat keine
 *  Sessions/booking und wird separat in resolveSelfStudyOffer/renderSelfStudyOffer behandelt. */
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

async function resolveSelfStudyOffer(audienceSlug: string, offerSlug: string): Promise<SelfStudyOffer | null> {
  const audience = audiences.find((a) => a.slug === audienceSlug)
  if (!audience) return null

  const offer = await getOfferBySlug(audience.id, offerSlug)
  if (offer == null || offer.kurstyp !== 'selbststudium') return null
  return offer
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ audience: string; angebot: string }>
}): Promise<Metadata> {
  const { audience, angebot } = await params

  const bookableOffer = await resolveBookableOffer(audience, angebot)
  if (bookableOffer) return { title: bookableOffer.displayName, description: bookableOffer.tagline }

  const selfStudyOffer = await resolveSelfStudyOffer(audience, angebot)
  if (selfStudyOffer) return { title: selfStudyOffer.displayName, description: selfStudyOffer.tagline }

  return {}
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

function SelfStudyOfferPage({ offer }: { offer: SelfStudyOffer }) {
  const extras = getSelfStudyPageExtras(offer.id)
  // Sollte laut Katalog-Wiring immer gesetzt sein (jeder SelfStudyOffer im Katalog hat einen
  // Eintrag in SELF_STUDY_PAGE_EXTRAS) -- Fallback auf offer.lede nur zur Robustheit.
  const hero = extras?.hero ?? { title: offer.displayName, description: offer.lede }
  const accessAction = extras?.accessAction ?? { kind: 'disabled' as const, label: 'Zugang erhalten', disabledReason: 'Buchung folgt in einer späteren Ausbaustufe' }

  return (
    <>
      <Section spacing="lg">
        <AudienceHero content={hero} />
      </Section>

      {offer.whyUs.length > 0 ? (
        <Section variant="muted">
          <WhyUsGrid features={offer.whyUs} />
        </Section>
      ) : null}

      <Section>
        <SelfStudyAccess offer={offer} accessAction={accessAction} />
      </Section>
    </>
  )
}

export default async function CourseOfferDetailPage({
  params,
}: {
  params: Promise<{ locale: string; audience: string; angebot: string }>
}) {
  const { locale, audience: audienceSlug, angebot } = await params
  setRequestLocale(locale)

  const selfStudyOffer = await resolveSelfStudyOffer(audienceSlug, angebot)
  if (selfStudyOffer) return <SelfStudyOfferPage offer={selfStudyOffer} />

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
