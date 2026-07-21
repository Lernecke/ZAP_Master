import Link from 'next/link'
import { requireAdmin } from '@/lib/auth/guards'
import { Badge } from '@/app/components/ui/badge'
import {
  getAdminOfferList,
  getAdminEditionSummaries,
  type AdminOfferListEntry,
} from '@/app/(dashboard)/dashboard/kurse/durchfuehrungen/actions'
import { getAudienceDisplayLabel, KURSTYP_LABELS } from '@/lib/kurse/offer-admin-catalog'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Entwurf',
  published: 'Veröffentlicht',
  archived: 'Archiviert',
}

export default async function KursangeboteAdminPage() {
  // Schritt 10a: die 20 stabilen Angebote sind zielgruppenunabhängig, Preis-/Publikationsrechte
  // sind admin-only (Abschnitt 2.12) -- kein requireContentManager() wie beim bestehenden
  // /dashboard/kurse-CRUD.
  await requireAdmin()

  const [offerListResult, summariesResult] = await Promise.all([getAdminOfferList(), getAdminEditionSummaries()])

  if (!offerListResult.success || !offerListResult.data) {
    return (
      <div className="p-6 lg:p-8">
        <div className="rounded-2xl border border-destructive/50 bg-destructive/10 p-6 text-center text-destructive">
          {!offerListResult.success ? offerListResult.error : 'Angebotskatalog konnte nicht geladen werden.'}
        </div>
      </div>
    )
  }

  const offerList = offerListResult.data
  const summaries = summariesResult.success && summariesResult.data ? summariesResult.data : []
  const summaryByOfferId = new Map(summaries.map((s) => [s.offerId, s]))

  const grouped = new Map<string, AdminOfferListEntry[]>()
  for (const entry of offerList) {
    const list = grouped.get(entry.audienceId) ?? []
    list.push(entry)
    grouped.set(entry.audienceId, list)
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Kursangebote</h1>
        <p className="text-muted-foreground mt-1">
          Die 20 stabilen Angebote aller Zielgruppen. Preise, Termine und Veröffentlichung werden je
          Jahresdurchführung gepflegt.
        </p>
      </div>

      <div className="space-y-8">
        {Array.from(grouped.entries()).map(([audienceId, entries]) => (
          <div key={audienceId}>
            <h2 className="text-sm font-mono uppercase tracking-wide text-muted-foreground mb-3">
              {getAudienceDisplayLabel(audienceId as never)}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {entries.map((entry) => {
                const summary = summaryByOfferId.get(entry.offerId)
                return (
                  <Link
                    key={entry.offerId}
                    href={`/dashboard/kurse/angebote/${entry.offerId}/durchfuehrungen/${summary ? summary.latestEditionId : 'neu'}`}
                    className="rounded-xl border border-border bg-card p-4 hover:border-primary transition-colors flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-foreground text-sm">{KURSTYP_LABELS[entry.kurstyp]}</span>
                      {summary ? (
                        <Badge variant={summary.status === 'published' ? 'default' : 'secondary'}>
                          {STATUS_LABELS[summary.status]}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Keine Durchführung</Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {summary ? `${summary.editionCount} Durchführung(en) · zuletzt ${summary.latestSchoolYear}` : 'Neue Durchführung anlegen'}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
