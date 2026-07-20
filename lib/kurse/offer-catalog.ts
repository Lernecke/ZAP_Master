// Statischer Angebotskatalog für Schritt 8 (Routing + Rendering-Strategie). Die Editions-/
// Sessions-Tabellen aus Schritt 5 Teil 3 (offers/offer_editions/course_sessions) sind bewusst noch
// leer -- es gibt noch keine Admin-Maske (Schritt 10a), die sie befüllt. Bis dahin bleibt die
// editoriale Angebotsquelle bei den bereits real aus den HTML-Referenzen übernommenen Fixtures aus
// types/marketing.fixtures.ts. Schritt 10 ersetzt/erweitert diesen Katalog audienceweise um die
// übrigen sechs Zielgruppen -- hier wird kein Inhalt für sie erfunden.

import {
  bmsSelbststudium,
  sechsKlasseAudiencePageModel,
  sechsKlasseHalbjahreskurs,
  sechsKlasseIntensivkurs,
  sechsKlasseIntensivkursSessions,
  sechsKlassePruefungssimulation,
} from '@/types/marketing.fixtures'
import type {
  AudienceHeroContent,
  AudienceId,
  CourseOffer,
  ExamSimulationOffer,
  SelfStudyOffer,
  SessionDefinition,
} from '@/types/marketing'

type OfferCatalogEntry = {
  offers: CourseOffer[]
  addOnOffers: (ExamSimulationOffer | SelfStudyOffer)[]
}

const EMPTY_ENTRY: OfferCatalogEntry = { offers: [], addOnOffers: [] }

const OFFER_CATALOG: Partial<Record<AudienceId, OfferCatalogEntry>> = {
  '6': {
    offers: [sechsKlasseHalbjahreskurs, sechsKlasseIntensivkurs],
    addOnOffers: [sechsKlassePruefungssimulation],
  },
  bms: {
    offers: [],
    addOnOffers: [bmsSelbststudium],
  },
}

/** Nur gesetzt, wo Schritt 6 bereits eine dedizierte, HTML-extrahierte Hero-Kopie geliefert hat. */
const AUDIENCE_HERO_OVERRIDES: Partial<Record<AudienceId, AudienceHeroContent>> = {
  '6': sechsKlasseAudiencePageModel.hero,
}

const OFFER_SESSIONS: Record<string, SessionDefinition[]> = {
  [sechsKlasseIntensivkurs.id]: sechsKlasseIntensivkursSessions,
}

export function getOfferCatalogEntry(audienceId: AudienceId): OfferCatalogEntry {
  return OFFER_CATALOG[audienceId] ?? EMPTY_ENTRY
}

export function getAudienceHeroOverride(audienceId: AudienceId): AudienceHeroContent | undefined {
  return AUDIENCE_HERO_OVERRIDES[audienceId]
}

export function findOfferBySlug(
  audienceId: AudienceId,
  offerSlug: string
): CourseOffer | ExamSimulationOffer | SelfStudyOffer | null {
  const entry = getOfferCatalogEntry(audienceId)
  return (
    entry.offers.find((offer) => offer.slug === offerSlug) ??
    entry.addOnOffers.find((offer) => offer.slug === offerSlug) ??
    null
  )
}

export function getSessionsForOfferId(offerId: string): SessionDefinition[] {
  return OFFER_SESSIONS[offerId] ?? []
}

/**
 * Für generateStaticParams: nur CourseOffer-Slugs (halbjahreskurs/intensivkurs) -- die dafür
 * nötigen Detailseiten-Komponenten existieren seit Schritt 6. ExamSimulationOffer/SelfStudyOffer
 * (addOnOffers) brauchen eigene, noch nicht gebaute Templates (Schritt 11 bzw. Schritt 9) und sind
 * deshalb hier bewusst ausgeschlossen -- ihre Detailrouten lösen bis dahin nicht auf.
 */
export function listCatalogedOfferParams(): { audience: AudienceId; angebot: string }[] {
  return (Object.entries(OFFER_CATALOG) as [AudienceId, OfferCatalogEntry][]).flatMap(
    ([audienceId, entry]) =>
      entry.offers.map((offer) => ({
        audience: audienceId,
        angebot: offer.slug,
      }))
  )
}
