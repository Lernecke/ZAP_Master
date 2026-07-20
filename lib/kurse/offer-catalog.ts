// Statischer Angebotskatalog für Schritt 8 (Routing + Rendering-Strategie). Die Editions-/
// Sessions-Tabellen aus Schritt 5 Teil 3 (offers/offer_editions/course_sessions) sind bewusst noch
// leer -- es gibt noch keine Admin-Maske (Schritt 10a), die sie befüllt. Bis dahin bleibt die
// editoriale Angebotsquelle bei den bereits real aus den HTML-Referenzen übernommenen Fixtures aus
// types/marketing.fixtures.ts. Schritt 10 ersetzt/erweitert diesen Katalog audienceweise um die
// übrigen sechs Zielgruppen -- hier wird kein Inhalt für sie erfunden.

import {
  fuenfKlasseAudiencePageModel,
  fuenfKlasseHalbjahreskurs,
  fuenfKlasseHalbjahreskursSessions,
  sechsKlasseAudiencePageModel,
  sechsKlasseHalbjahreskurs,
  sechsKlasseIntensivkurs,
  sechsKlasseIntensivkursSessions,
  sechsKlassePruefungssimulation,
  vierKlasseAudiencePageModel,
  vierKlasseHalbjahreskurs,
  vierKlasseHalbjahreskursSessions,
  vierKlasseLerncampSportferien,
  vierKlasseLerncampSessions,
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
  '4': {
    offers: [vierKlasseHalbjahreskurs, vierKlasseLerncampSportferien],
    addOnOffers: [],
  },
  // '5': nur Halbjahreskurs -- das Lerncamp-Angebot hat einen ungelösten Preiskonflikt zwischen
  // Haupt- und Unterseite (CHF 950 vs. CHF 890, kein "regulär"-Anker) und bleibt bis zur
  // fachlichen Preisfreigabe ausserhalb des Katalogs, siehe Kommentar bei
  // fuenfKlasseHalbjahreskurs in types/marketing.fixtures.ts.
  '5': {
    offers: [fuenfKlasseHalbjahreskurs],
    addOnOffers: [],
  },
  '6': {
    offers: [sechsKlasseHalbjahreskurs, sechsKlasseIntensivkurs],
    addOnOffers: [sechsKlassePruefungssimulation],
  },
  // bms.addOnOffers bewusst leer: bmsSelbststudium (types/marketing.fixtures.ts) hat noch keinen
  // Renderer in [angebot]/page.tsx (das rendert nur CourseOffer/halbjahreskurs+intensivkurs). Die
  // drei Selbststudium-Seiten (BMS + 6. Klasse + 2./3. Sek) gehören laut Ausführungsplan als EINE
  // Einheit in einen eigenen späteren Schritt -- nicht BMS allein, sonst Halb-Feature/toter Link.
  bms: {
    offers: [],
    addOnOffers: [],
  },
}

/** Nur gesetzt, wo Schritt 6 bereits eine dedizierte, HTML-extrahierte Hero-Kopie geliefert hat. */
const AUDIENCE_HERO_OVERRIDES: Partial<Record<AudienceId, AudienceHeroContent>> = {
  '4': vierKlasseAudiencePageModel.hero,
  '5': fuenfKlasseAudiencePageModel.hero,
  '6': sechsKlasseAudiencePageModel.hero,
}

const OFFER_SESSIONS: Record<string, SessionDefinition[]> = {
  [vierKlasseHalbjahreskurs.id]: vierKlasseHalbjahreskursSessions,
  [vierKlasseLerncampSportferien.id]: vierKlasseLerncampSessions,
  [fuenfKlasseHalbjahreskurs.id]: fuenfKlasseHalbjahreskursSessions,
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
 * Für generateStaticParams: CourseOffer- und ExamSimulationOffer-Slugs -- beide haben seit
 * Schritt 6/11 eine Detailseiten-Vorlage. SelfStudyOffer (z. B. bmsSelbststudium, aktuell ohnehin
 * nicht im Katalog) bleibt bewusst ausgeschlossen -- kein Renderer, siehe Schritt-9-Korrektur.
 */
export function listCatalogedOfferParams(): { audience: AudienceId; angebot: string }[] {
  return (Object.entries(OFFER_CATALOG) as [AudienceId, OfferCatalogEntry][]).flatMap(
    ([audienceId, entry]) =>
      [...entry.offers, ...entry.addOnOffers.filter((offer) => offer.kurstyp !== 'selbststudium')].map(
        (offer) => ({
          audience: audienceId,
          angebot: offer.slug,
        })
      )
  )
}
