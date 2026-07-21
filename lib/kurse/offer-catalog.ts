// Statischer Angebotskatalog für Schritt 8 (Routing + Rendering-Strategie). Die Editions-/
// Sessions-Tabellen aus Schritt 5 Teil 3 (offers/offer_editions/course_sessions) sind bewusst noch
// leer -- es gibt noch keine Admin-Maske (Schritt 10a), die sie befüllt. Bis dahin bleibt die
// editoriale Angebotsquelle bei den bereits real aus den HTML-Referenzen übernommenen Fixtures aus
// types/marketing.fixtures.ts. Schritt 10 ersetzt/erweitert diesen Katalog audienceweise um die
// übrigen sechs Zielgruppen -- hier wird kein Inhalt für sie erfunden.

import {
  bmsAudiencePageModel,
  bmsIntensivkurs,
  bmsIntensivkursSessions,
  bmsPruefungssimulation,
  bmsSelbststudium,
  bmsSelbststudiumPageModel,
  maturaAudiencePageModel,
  maturaHalbjahreskurs,
  maturaHalbjahreskursSessions,
  maturaIntensivwoche,
  maturaIntensivwocheSessions,
  einsSekAudiencePageModel,
  einsSekLerncampSportferien,
  einsSekLerncampSessions,
  einsSekVorkurs,
  einsSekVorkursSessions,
  fuenfKlasseAudiencePageModel,
  fuenfKlasseHalbjahreskurs,
  fuenfKlasseHalbjahreskursSessions,
  sechsKlasseAudiencePageModel,
  sechsKlasseHalbjahreskurs,
  sechsKlasseIntensivkurs,
  sechsKlasseIntensivkursSessions,
  sechsKlassePruefungssimulation,
  sechsKlasseSelbststudium,
  sechsKlasseSelbststudiumPageModel,
  vierKlasseAudiencePageModel,
  vierKlasseHalbjahreskurs,
  vierKlasseHalbjahreskursSessions,
  vierKlasseLerncampSportferien,
  vierKlasseLerncampSessions,
  zweiDreiSekAudiencePageModel,
  zweiDreiSekHalbjahreskurs,
  zweiDreiSekHalbjahreskursSessions,
  zweiDreiSekIntensivkurs,
  zweiDreiSekIntensivkursSessions,
  zweiDreiSekPruefungssimulation,
  zweiDreiSekPruefungssimulationSessions,
  zweiDreiSekSelbststudium,
  zweiDreiSekSelbststudiumPageModel,
} from '@/types/marketing.fixtures'
import type {
  AudienceHeroContent,
  AudienceId,
  CourseOffer,
  ExamSimulationOffer,
  SelfStudyOffer,
  SessionDefinition,
  UserAction,
} from '@/types/marketing'
import { audiences } from '@/app/data/marketing-site'

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
  '1-sek': {
    offers: [einsSekVorkurs, einsSekLerncampSportferien],
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
    addOnOffers: [sechsKlassePruefungssimulation, sechsKlasseSelbststudium],
  },
  '2-3-sek': {
    offers: [zweiDreiSekHalbjahreskurs, zweiDreiSekIntensivkurs],
    addOnOffers: [zweiDreiSekPruefungssimulation, zweiDreiSekSelbststudium],
  },
  // bms.offers: nur der Intensivkurs -- die Halbjahreskurs-Karte der Hauptseite verlinkt fälschlich
  // auf die Intensivkurs-Unterseite (kein echter eigener Detailinhalt, siehe Kommentar bei
  // bmsIntensivkurs in types/marketing.fixtures.ts).
  bms: {
    offers: [bmsIntensivkurs],
    addOnOffers: [bmsPruefungssimulation, bmsSelbststudium],
  },
  matura: {
    offers: [maturaHalbjahreskurs, maturaIntensivwoche],
    addOnOffers: [],
  },
}

/** Nur gesetzt, wo Schritt 6 bereits eine dedizierte, HTML-extrahierte Hero-Kopie geliefert hat. */
const AUDIENCE_HERO_OVERRIDES: Partial<Record<AudienceId, AudienceHeroContent>> = {
  '4': vierKlasseAudiencePageModel.hero,
  '5': fuenfKlasseAudiencePageModel.hero,
  '6': sechsKlasseAudiencePageModel.hero,
  '1-sek': einsSekAudiencePageModel.hero,
  '2-3-sek': zweiDreiSekAudiencePageModel.hero,
  bms: bmsAudiencePageModel.hero,
  matura: maturaAudiencePageModel.hero,
}

/** Pro-Offer Hero/accessAction für SelfStudyOffer-Detailseiten -- SelfStudyPageModel hat einen
 *  eigenen Hero (nicht den Audience-Hero) und keine Sessions/booking, siehe
 *  [angebot]/page.tsx's SelfStudyOffer-Zweig. */
const SELF_STUDY_PAGE_EXTRAS: Record<string, { hero: AudienceHeroContent; accessAction: UserAction }> = {
  [bmsSelbststudium.id]: {
    hero: bmsSelbststudiumPageModel.hero,
    accessAction: bmsSelbststudiumPageModel.accessAction,
  },
  [sechsKlasseSelbststudium.id]: {
    hero: sechsKlasseSelbststudiumPageModel.hero,
    accessAction: sechsKlasseSelbststudiumPageModel.accessAction,
  },
  [zweiDreiSekSelbststudium.id]: {
    hero: zweiDreiSekSelbststudiumPageModel.hero,
    accessAction: zweiDreiSekSelbststudiumPageModel.accessAction,
  },
}

const OFFER_SESSIONS: Record<string, SessionDefinition[]> = {
  [vierKlasseHalbjahreskurs.id]: vierKlasseHalbjahreskursSessions,
  [vierKlasseLerncampSportferien.id]: vierKlasseLerncampSessions,
  [fuenfKlasseHalbjahreskurs.id]: fuenfKlasseHalbjahreskursSessions,
  [einsSekVorkurs.id]: einsSekVorkursSessions,
  [einsSekLerncampSportferien.id]: einsSekLerncampSessions,
  [zweiDreiSekHalbjahreskurs.id]: zweiDreiSekHalbjahreskursSessions,
  [zweiDreiSekIntensivkurs.id]: zweiDreiSekIntensivkursSessions,
  [zweiDreiSekPruefungssimulation.id]: zweiDreiSekPruefungssimulationSessions,
  [bmsIntensivkurs.id]: bmsIntensivkursSessions,
  [maturaHalbjahreskurs.id]: maturaHalbjahreskursSessions,
  [maturaIntensivwoche.id]: maturaIntensivwocheSessions,
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

export function getSelfStudyPageExtras(
  offerId: string
): { hero: AudienceHeroContent; accessAction: UserAction } | undefined {
  return SELF_STUDY_PAGE_EXTRAS[offerId]
}

/**
 * Für generateStaticParams: CourseOffer-, ExamSimulationOffer- und seit der Selbststudium-Runde
 * auch SelfStudyOffer-Slugs -- alle drei haben jetzt eine Detailseiten-Vorlage in
 * [angebot]/page.tsx.
 *
 * `audience` muss der Route-Slug sein (z.B. "4-klasse"), nicht die interne AudienceId (z.B. "4")
 * -- der dynamische Routensegment-Ordner [audience] matcht den Slug aus der URL, nicht die ID.
 * Eine frühere Fassung gab hier versehentlich die AudienceId zurück, wodurch generateStaticParams
 * falsche Pfade wie "/kurse/4/halbjahreskurs" statt "/kurse/4-klasse/halbjahreskurs" erzeugte.
 */
export function listCatalogedOfferParams(): { audience: string; angebot: string }[] {
  return (Object.entries(OFFER_CATALOG) as [AudienceId, OfferCatalogEntry][]).flatMap(
    ([audienceId, entry]) => {
      const slug = audiences.find((a) => a.id === audienceId)?.slug
      if (!slug) return []
      return [...entry.offers, ...entry.addOnOffers].map((offer) => ({
        audience: slug,
        angebot: offer.slug,
      }))
    }
  )
}
