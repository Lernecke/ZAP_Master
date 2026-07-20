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
    addOnOffers: [sechsKlassePruefungssimulation],
  },
  // '2-3-sek'.addOnOffers bewusst leer: Layout_2_Sek_Pruefungssimulation.html nutzt laut
  // Abschnitt 4 ein fremdes Design-System und braucht eine eigene, separate Extraktionsrunde
  // (analog zur 6.-Klasse-Trennung in Schritt 11) -- kein Content dafür in dieser Runde erfunden.
  '2-3-sek': {
    offers: [zweiDreiSekHalbjahreskurs, zweiDreiSekIntensivkurs],
    addOnOffers: [],
  },
  // bms.offers: nur der Intensivkurs -- die Halbjahreskurs-Karte der Hauptseite verlinkt fälschlich
  // auf die Intensivkurs-Unterseite (kein echter eigener Detailinhalt, siehe Kommentar bei
  // bmsIntensivkurs in types/marketing.fixtures.ts). bmsSelbststudium (dort ebenfalls bereits als
  // Fixture vorhanden) bleibt weiterhin unverdrahtet: kein Renderer in [angebot]/page.tsx für
  // SelfStudyOffer. Die drei Selbststudium-Seiten (BMS + 6. Klasse + 2./3. Sek) gehören laut
  // Ausführungsplan als EINE Einheit in einen eigenen späteren Schritt -- nicht BMS allein, sonst
  // Halb-Feature/toter Link.
  bms: {
    offers: [bmsIntensivkurs],
    addOnOffers: [bmsPruefungssimulation],
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
}

const OFFER_SESSIONS: Record<string, SessionDefinition[]> = {
  [vierKlasseHalbjahreskurs.id]: vierKlasseHalbjahreskursSessions,
  [vierKlasseLerncampSportferien.id]: vierKlasseLerncampSessions,
  [fuenfKlasseHalbjahreskurs.id]: fuenfKlasseHalbjahreskursSessions,
  [einsSekVorkurs.id]: einsSekVorkursSessions,
  [einsSekLerncampSportferien.id]: einsSekLerncampSessions,
  [zweiDreiSekHalbjahreskurs.id]: zweiDreiSekHalbjahreskursSessions,
  [zweiDreiSekIntensivkurs.id]: zweiDreiSekIntensivkursSessions,
  [bmsIntensivkurs.id]: bmsIntensivkursSessions,
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
