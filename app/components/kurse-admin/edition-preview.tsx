// Schritt 10a: "Live-Vorschau Kachel" aus der Admin-Referenz -- rein präsentational, keine eigene
// Datenquelle. Liest bevorzugt die ungespeicherten Formularwerte (liveValues), damit Preis-/
// Titeländerungen sofort sichtbar sind, genau wie im Mockup-JS.

import type { OfferEditionFormInput } from '@/types/kurs-edition'
import type { AdminOfferCatalogEntry } from '@/lib/kurse/offer-admin-catalog'

function formatChf(amount: number): string {
  return `CHF ${amount.toLocaleString('de-CH')}`
}

export function EditionPreview({
  catalogEntry,
  liveValues,
  activeSessionCount,
}: {
  catalogEntry: AdminOfferCatalogEntry
  liveValues: OfferEditionFormInput | null
  activeSessionCount: number
}) {
  const title = liveValues?.publicTitle || catalogEntry.label
  const tagline = liveValues?.tagline || ''
  const regularPrice = liveValues?.regularPriceChf ?? 0
  const earlyBirdEnabled = liveValues?.earlyBirdEnabled ?? false
  const earlyBirdPrice = liveValues?.earlyBirdPriceChf
  const earlyBirdDeadline = liveValues?.earlyBirdDeadline

  return (
    <section className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
      <div className="p-5 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
        <small className="font-mono text-[10px] uppercase tracking-wide opacity-80">Live-Vorschau Kachel</small>
        <h3 className="font-serif text-xl mt-1.5">{title}</h3>
        {tagline && <p className="text-xs opacity-85 mt-2">{tagline}</p>}
      </div>
      <div className="p-4 space-y-2 text-sm">
        <div className="flex justify-between border-b border-border pb-2">
          <span className="text-muted-foreground">Aktuelle Auswahl</span>
          <strong>{catalogEntry.label}</strong>
        </div>
        <div className="flex justify-between border-b border-border pb-2">
          <span className="text-muted-foreground">Schuljahr</span>
          <strong>{liveValues?.schoolYear || '–'}</strong>
        </div>
        <div className="flex justify-between border-b border-border pb-2">
          <span className="text-muted-foreground">Termine</span>
          <strong>{activeSessionCount} buchbar</strong>
        </div>
        <div className="flex justify-between border-b border-border pb-2">
          <span className="text-muted-foreground">Preis</span>
          <strong className="font-serif text-lg text-secondary-foreground">{formatChf(regularPrice)}</strong>
        </div>
        {earlyBirdEnabled && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Frühbucherpreis</span>
            <strong>
              {earlyBirdPrice != null ? `${formatChf(earlyBirdPrice)} · bis ${earlyBirdDeadline || 'Stichtag offen'}` : 'Noch festlegen'}
            </strong>
          </div>
        )}
      </div>
    </section>
  )
}
