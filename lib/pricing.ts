// Zentrale Preisformatierung für Offer-Preise (design-reference/architektur-briefing-kursseiten.md
// Abschnitt 2.2/2.3). Preise sind immer berechnete Werte, nie ein fertig gepflegter Satz -- diese
// Funktion ist die einzige Stelle, die den Frühbucher-/Regulärpreis-Vergleich anstellt, damit
// CourseCard und CourseHero nicht unabhängig voneinander abweichen können (der genaue Bug, den
// Abschnitt 2.3 dokumentiert).

interface OfferPriceInput {
  regularPriceRappen: number
  earlyBirdPriceRappen?: number
  earlyBirdDeadline?: string
  currency: 'CHF'
  priceUnit?: string
}

export interface FormattedOfferPrice {
  /** Prominent anzuzeigender Preis (Frühbucherpreis, falls aktiv, sonst der reguläre Preis). */
  value: string
  /** Zusatzzeile: Frühbucherhinweis mit Regulärpreis, sonst offer.priceUnit falls gesetzt. */
  note?: string
}

export function formatChfRappen(rappen: number, locale = 'de-CH'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'CHF',
    minimumFractionDigits: rappen % 100 === 0 ? 0 : 2,
  }).format(rappen / 100)
}

export function formatOfferPrice(offer: OfferPriceInput, locale = 'de-CH'): FormattedOfferPrice {
  if (offer.earlyBirdPriceRappen != null && offer.earlyBirdDeadline) {
    const deadlineLabel = new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: 'long',
    }).format(new Date(offer.earlyBirdDeadline))

    return {
      value: formatChfRappen(offer.earlyBirdPriceRappen, locale),
      note: `Frühbucherrabatt bis ${deadlineLabel} · regulär ${formatChfRappen(offer.regularPriceRappen, locale)}`,
    }
  }

  return {
    value: formatChfRappen(offer.regularPriceRappen, locale),
    note: offer.priceUnit,
  }
}
