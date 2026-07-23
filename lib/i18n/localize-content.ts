// Technische Grundlage fuer die spaetere Englisch-Aktivierung (Abschnitt 8 des
// Architektur-Briefings). Deutsch bleibt die einzige Quelle der Wahrheit in
// types/marketing.fixtures.ts -- diese Datei mergt optionale, unvollstaendige
// Teil-Uebersetzungen darueber, statt jedes Fixture-Feld auf ein lokalisiertes Record-Objekt
// umzustellen (das wuerde jede der ~30 Fixture-Objekte und jede sie konsumierende Komponente
// treffen, ohne aktuellen Nutzen, solange keine Uebersetzung existiert).
//
// Verwendungsmuster, um dieselbe Lokalisierung spaeter auf weitere Seiten (Home, Ueber-uns,
// Tipps, Kontakt, Rechtstexte, Nav) auszuweiten:
//   1. Eine neue `*_TRANSLATIONS: Record<StableId, LocaleOverlay<T>>`-Map anlegen (analog
//      OFFER_TRANSLATIONS in types/marketing.translations.ts), zunaechst leer.
//   2. Den jeweiligen Loader um einen `locale: string`-Parameter erweitern.
//   3. `localizeContent(base, TRANSLATIONS[stableId], locale)` auf das geladene Objekt anwenden,
//      bevor es an die Seite zurueckgegeben wird.
// Bewusst noch nicht fuer diese weiteren Seiten gebaut, da dafuer noch keine Inhalte anstehen.

export type DeepPartial<T> = T extends (infer U)[]
  ? DeepPartial<U>[]
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T

// Nur nicht-deutsche Locales -- Deutsch ist die Basis, kein Overlay noetig/erlaubt.
export type LocaleOverlay<T> = Partial<Record<'en', DeepPartial<T>>>

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function mergeArrays<T>(base: T[], overlay: unknown[]): T[] {
  // Arrays aus Objekten mit stabiler `id` (whyUs, flowSteps, testimonials, faq, ablauf-items, ...)
  // werden per id gematcht, nicht per Index -- eine unvollstaendige Uebersetzung (nur manche
  // Eintraege vorhanden) faellt fuer die uebrigen Eintraege korrekt auf Deutsch zurueck, statt
  // Eintraege zu verschieben oder zu verlieren.
  const firstItem = base[0]
  const hasStableIds = base.length > 0 && isPlainObject(firstItem) && 'id' in firstItem

  if (!hasStableIds) {
    // Plain-Value-Arrays (z.B. string[] wie dateSummary/features) -- Index-Merge.
    return base.map((item, index) => mergeDeep(item, overlay[index]))
  }

  const overlayById = new Map(
    overlay.filter(isPlainObject).map((item) => [item.id, item] as const)
  )
  return base.map((item) => {
    const id = (item as unknown as { id: unknown }).id
    const matchingOverlay = overlayById.get(id)
    return matchingOverlay === undefined ? item : mergeDeep(item, matchingOverlay)
  })
}

function mergeDeep<T>(base: T, overlay: unknown): T {
  if (overlay === undefined || overlay === null) return base

  if (Array.isArray(base)) {
    return Array.isArray(overlay) ? (mergeArrays(base, overlay) as unknown as T) : base
  }

  if (isPlainObject(base)) {
    if (!isPlainObject(overlay)) return base
    const merged: Record<string, unknown> = { ...base }
    for (const key of Object.keys(overlay)) {
      merged[key] = mergeDeep((base as Record<string, unknown>)[key], overlay[key])
    }
    return merged as T
  }

  // Primitiver Wert (string/number/boolean) -- Overlay ersetzt direkt.
  return overlay as T
}

/**
 * Mergt eine optionale Teil-Uebersetzung ueber das deutsche Basisobjekt. Bei `locale === 'de'`
 * oder fehlendem Overlay ist dies ein reiner Passthrough (Nullkosten-Pfad fuer den heutigen
 * Deutsch-only-Betrieb) -- `base` wird unveraendert zurueckgegeben, keine Kopie erzeugt.
 */
export function localizeContent<T>(base: T, overlay: LocaleOverlay<T> | undefined, locale: string): T {
  if (locale === 'de' || !overlay) return base
  const localeOverlay = overlay[locale as 'en']
  if (!localeOverlay) return base
  return mergeDeep(base, localeOverlay)
}
