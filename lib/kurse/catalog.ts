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

export async function getOfferCatalogForAudience(audienceId: AudienceId): Promise<{
  offers: CourseOffer[]
  addOnOffers: (ExamSimulationOffer | SelfStudyOffer)[]
}> {
  'use cache'
  cacheLife('hours')
  cacheTag('offers', `offers:${audienceId}`)

  return getOfferCatalogEntry(audienceId)
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

  return findOfferBySlug(audienceId, offerSlug)
}

export async function getSessionsForOffer(offerId: string): Promise<SessionDefinition[]> {
  'use cache'
  cacheLife('hours')
  cacheTag('courses', `course:${offerId}`)

  return getSessionsForOfferId(offerId)
}
