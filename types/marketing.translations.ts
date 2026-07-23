import type {
  AudienceHeroContent,
  AudienceId,
  CourseOffer,
  ExamSimulationOffer,
  SelfStudyOffer,
  SessionDefinition,
} from './marketing'
import type { LocaleOverlay } from '@/lib/i18n/localize-content'

// Technische Grundlage fuer die spaetere Englisch-Aktivierung (siehe lib/i18n/localize-content.ts
// fuer den Merge-Mechanismus und das Muster, um dies auf weitere Seiten auszuweiten). Beide Maps
// sind bewusst leer -- die eigentlichen Uebersetzungen kommen spaeter von einer Fachperson, nicht
// aus dieser Aenderung. i18n/routing.ts routet "en" weiterhin nicht; Eintraege hier bleiben bis
// dahin folgenlos.

/** Beispiel-Vorlage (auskommentiert) fuer einen Uebersetzungseintrag:
 *
 * export const OFFER_TRANSLATIONS: Record<string, LocaleOverlay<CourseOffer | ExamSimulationOffer | SelfStudyOffer>> = {
 *   'offer-6klasse-halbjahreskurs': {
 *     en: {
 *       displayName: 'Semester course',
 *       tagline: 'Broad preparation across the whole semester',
 *       whyUs: [
 *         { id: 'lerncoaching-jeder-termin', title: 'Coaching at every session', description: '...' },
 *         // Fehlende ids fallen automatisch auf die deutsche Fassung zurueck.
 *       ],
 *     },
 *   },
 * }
 */
export const OFFER_TRANSLATIONS: Record<
  string,
  LocaleOverlay<CourseOffer | ExamSimulationOffer | SelfStudyOffer>
> = {}

export const AUDIENCE_HERO_TRANSLATIONS: Partial<Record<AudienceId, LocaleOverlay<AudienceHeroContent>>> = {}

// Session-Termine (kurs/dateLabel/timeLabel) sind ebenfalls Prosa (z.B. Monatsnamen), keine reinen
// Formatierungsdaten -- gekeyt auf die stabile numerische Session-id.
export const SESSION_TRANSLATIONS: Record<number, LocaleOverlay<SessionDefinition>> = {}
