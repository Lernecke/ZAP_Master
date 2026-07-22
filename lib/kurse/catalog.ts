// Gecachte Katalog-Loader für die Marketing-Kursseiten (Abschnitt 7, Punkt 1 des
// Architektur-Briefings: stabile Kursdaten über 'use cache'/cacheLife/cacheTag, nie über
// unstable_cache oder Route-Segment-Exports). Verfügbarkeit ist bewusst NICHT hier -- siehe
// lib/kurse/availability.ts, das ungecacht nach connection() aufgerufen wird.

import { createClient } from '@supabase/supabase-js'
import { cacheLife, cacheTag } from 'next/cache'
import type { Database } from '@/types/database'
import type { KursDB } from '@/types/kurs-form'
import type {
  AudienceHeroContent,
  AudienceId,
  CourseOffer,
  ExamSimulationOffer,
  ExistingCourseCardModel,
  SelfStudyOffer,
  SessionDefinition,
} from '@/types/marketing'
import { mapKursRowToExistingCourseCard, mapKlassenstufeToAudienceIds } from './mapper'
import {
  findOfferBySlug,
  getAudienceHeroOverride,
  getOfferCatalogEntry,
  getSessionsForOfferId,
} from './offer-catalog'

// Cookie-freier anon-Client -- innerhalb von 'use cache' ist cookies()/headers() nicht erlaubt.
// Identisches, bereits etabliertes Muster wie getPublicKurse() in app/(public)/kurse/actions.ts.
function createCatalogSupabaseClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function getExistingCoursesForAudience(
  audienceId: AudienceId
): Promise<ExistingCourseCardModel[]> {
  'use cache'
  cacheLife('hours')
  cacheTag('courses', `courses:audience:${audienceId}`)

  const supabase = createCatalogSupabaseClient()
  const { data, error } = await supabase
    .from('intensivwoche_kurse')
    .select('*')
    .eq('ist_aktiv', true)
    .order('start_datum', { ascending: true })

  if (error) {
    console.error('getExistingCoursesForAudience:', error)
    return []
  }

  return (data as KursDB[])
    .filter((row) => mapKlassenstufeToAudienceIds(row.klassenstufen).includes(audienceId))
    .map(mapKursRowToExistingCourseCard)
    .filter((card): card is ExistingCourseCardModel => card != null)
}

// Abschnitt 2.12: Preise sollen ab jetzt über /dashboard/kurse/angebote live editierbar sein,
// nicht mehr nur als statischer Fixture-Wert. Überschreibt AUSSCHLIESSLICH die Preisfelder mit dem
// zugehörigen published offer_editions-Datensatz (20260722130621_seed_published_offer_editions.sql
// hat für jedes bereits publizierte Angebot einen mit dem bisherigen Fixture-Wert identischen
// Startwert angelegt) -- Titel/Tagline/Beschreibung/Sessions bleiben bewusst bei den Fixtures, das
// war nicht Teil dieser Anfrage. Ohne passende published-Zeile (z. B. BMS-Halbjahreskurs, das
// bewusst ohne Edition bleibt) bleibt der Fixture-Preis unverändert die Quelle -- kein Fallback auf
// 0 oder ein Fehler.
async function applyLivePriceOverrides<T extends CourseOffer | ExamSimulationOffer | SelfStudyOffer>(
  offers: T[]
): Promise<T[]> {
  if (offers.length === 0) return offers

  const supabase = createCatalogSupabaseClient()
  const audienceIds = [...new Set(offers.map((o) => o.audienceId))]

  // Zwei einfache Abfragen statt eines PostgREST-Embeds: robuster gegen die generische
  // Typinferenz der generierten Supabase-Typen bei verschachtelten Selects (bereits an anderer
  // Stelle in diesem Projekt empirisch aufgetreten, siehe
  // app/(dashboard)/dashboard/mail-outbox/actions.ts).
  const { data: offerRows, error: offersError } = await supabase
    .from('offers')
    .select('id, audience_id, kurstyp, slug')
    .in('audience_id', audienceIds)

  if (offersError || !offerRows || offerRows.length === 0) return offers

  const offerIdByKey = new Map<string, number>()
  for (const row of offerRows) {
    offerIdByKey.set(`${row.audience_id}|${row.kurstyp}|${row.slug}`, row.id)
  }

  const { data: editionRows, error: editionsError } = await supabase
    .from('offer_editions')
    .select('offer_id, regular_price_rappen, early_bird_enabled, early_bird_price_rappen, early_bird_deadline')
    .eq('status', 'published')
    .in('offer_id', offerRows.map((row) => row.id))

  if (editionsError || !editionRows) return offers

  const priceByOfferId = new Map(editionRows.map((row) => [row.offer_id, row]))

  return offers.map((offer) => {
    const offerId = offerIdByKey.get(`${offer.audienceId}|${offer.kurstyp}|${offer.slug}`)
    const livePrice = offerId != null ? priceByOfferId.get(offerId) : undefined
    if (!livePrice) return offer

    if (offer.kurstyp === 'selbststudium') {
      return { ...offer, regularPriceRappen: livePrice.regular_price_rappen }
    }
    return {
      ...offer,
      regularPriceRappen: livePrice.regular_price_rappen,
      earlyBirdPriceRappen: livePrice.early_bird_enabled ? livePrice.early_bird_price_rappen ?? undefined : undefined,
      earlyBirdDeadline: livePrice.early_bird_enabled ? livePrice.early_bird_deadline ?? undefined : undefined,
    }
  })
}

export async function getOfferCatalogForAudience(audienceId: AudienceId): Promise<{
  offers: CourseOffer[]
  addOnOffers: (ExamSimulationOffer | SelfStudyOffer)[]
}> {
  'use cache'
  cacheLife('hours')
  cacheTag('offers', `offers:${audienceId}`)

  const entry = getOfferCatalogEntry(audienceId)
  const [offers, addOnOffers] = await Promise.all([
    applyLivePriceOverrides(entry.offers),
    applyLivePriceOverrides(entry.addOnOffers),
  ])
  return { offers, addOnOffers }
}

export async function getAudienceHero(
  audienceId: AudienceId,
  fallback: AudienceHeroContent
): Promise<AudienceHeroContent> {
  'use cache'
  cacheLife('hours')
  cacheTag('offers', `offers:${audienceId}`)

  return getAudienceHeroOverride(audienceId) ?? fallback
}

export async function getOfferBySlug(
  audienceId: AudienceId,
  offerSlug: string
): Promise<CourseOffer | ExamSimulationOffer | SelfStudyOffer | null> {
  'use cache'
  cacheLife('hours')
  cacheTag('offers', `offers:${audienceId}`)

  const offer = findOfferBySlug(audienceId, offerSlug)
  if (!offer) return null
  const [withLivePrice] = await applyLivePriceOverrides([offer])
  return withLivePrice
}

export async function getSessionsForOffer(offerId: string): Promise<SessionDefinition[]> {
  'use cache'
  cacheLife('hours')
  cacheTag('courses', `course:${offerId}`)

  return getSessionsForOfferId(offerId)
}
