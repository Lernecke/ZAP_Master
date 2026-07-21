'use client'

// Schritt 10d: "Wirtschaftlichkeit pro Angebot"-Panel aus Layout_Admin_Finanzcockpit.html.

import { useMemo, useState } from 'react'
import { Badge } from '@/app/components/ui/badge'
import type { OfferFinancialSummary, RevenueBasis } from '@/types/kurs-finanzen'
import { getAudienceDisplayLabel } from '@/lib/kurse/offer-admin-catalog'

function formatChf(rappen: number): string {
  return 'CHF ' + (rappen / 100).toLocaleString('de-CH', { maximumFractionDigits: 0 })
}

function revenueFor(summary: OfferFinancialSummary, basis: RevenueBasis): number {
  if (basis === 'booked') return summary.bookedRevenueRappen
  if (basis === 'paid') return summary.paidRevenueRappen
  return summary.recognizedRevenueRappen
}

export function OfferProfitabilityTable({ summaries, basis }: { summaries: OfferFinancialSummary[]; basis: RevenueBasis }) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'revenue' | 'participants' | 'margin'>('revenue')

  const rows = useMemo(() => {
    const withMargin = summaries.map((s) => {
      const revenue = revenueFor(s, basis)
      const contribution = revenue + s.refundRappen - s.directCostRappen
      const marginPercent = revenue > 0 ? (contribution / revenue) * 100 : 0
      const occupancyPercent = s.occupancyApplicable && s.capacity ? Math.min(100, Math.round((s.participantCount / s.capacity) * 100)) : null
      return { ...s, revenue, contribution, marginPercent, occupancyPercent }
    })
    const filtered = withMargin.filter((s) => s.offerLabel.toLowerCase().includes(search.toLowerCase()))
    return filtered.sort((a, b) => {
      if (sort === 'participants') return b.participantCount - a.participantCount
      if (sort === 'margin') return b.marginPercent - a.marginPercent
      return b.revenue - a.revenue
    })
  }, [summaries, basis, search, sort])

  return (
    <section className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-border">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Wirtschaftlichkeit pro Angebot</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Teilnehmerzahl, Umsatz und direkt zurechenbare Kosten im gewählten Zeitraum</p>
        </div>
        <div className="flex gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Angebot suchen …"
            className="h-9 w-48 px-3 rounded-lg border border-border bg-background text-sm"
          />
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="h-9 px-2 rounded-lg border border-border bg-background text-sm">
            <option value="revenue">Nach Umsatz</option>
            <option value="participants">Nach Teilnehmern</option>
            <option value="margin">Nach Marge</option>
          </select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground font-mono">
              <th className="text-left px-3 py-2.5">Angebot</th>
              <th className="text-right px-3 py-2.5">Teilnehmer</th>
              <th className="text-right px-3 py-2.5">Auslastung</th>
              <th className="text-right px-3 py-2.5">Umsatz</th>
              <th className="text-right px-3 py-2.5">Direkte Lohnkosten</th>
              <th className="text-right px-3 py-2.5">Deckungsbeitrag / Marge</th>
              <th className="text-left px-3 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.editionId} className="border-t border-border hover:bg-muted/30">
                <td className="px-3 py-3">
                  <strong className="block text-foreground">{row.offerLabel}</strong>
                  <small className="text-muted-foreground">
                    {getAudienceDisplayLabel(row.audienceId as never)} · {row.schoolYear}
                  </small>
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  <strong className="block">{row.participantCount}</strong>
                  <small className="text-muted-foreground">{row.sessionCount} Kursgruppe(n){row.capacity ? ` · ${row.capacity} Plätze` : ''}</small>
                </td>
                <td className="px-3 py-3 text-right">
                  {row.occupancyPercent != null ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-12 h-1.5 rounded-full bg-muted overflow-hidden inline-block">
                        <span className="block h-full bg-secondary" style={{ width: `${row.occupancyPercent}%` }} />
                      </span>
                      <strong className="tabular-nums">{row.occupancyPercent}%</strong>
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">nicht relevant</span>
                  )}
                </td>
                <td className="px-3 py-3 text-right tabular-nums font-semibold">{formatChf(row.revenue)}</td>
                <td className="px-3 py-3 text-right tabular-nums">{formatChf(row.directCostRappen)}</td>
                <td className="px-3 py-3 text-right min-w-[130px]">
                  <div className="flex justify-between gap-2 mb-1">
                    <strong className={row.contribution < 0 ? 'text-destructive' : ''}>{formatChf(row.contribution)}</strong>
                    <span className="text-xs text-muted-foreground">{row.marginPercent.toFixed(1)}%</span>
                  </div>
                  <span className="block w-full h-1.5 rounded-full bg-muted overflow-hidden">
                    <span
                      className={`block h-full ${row.marginPercent < 0 ? 'bg-destructive' : row.marginPercent < 35 ? 'bg-accent' : 'bg-secondary'}`}
                      style={{ width: `${Math.min(100, Math.max(0, row.marginPercent))}%` }}
                    />
                  </span>
                </td>
                <td className="px-3 py-3">
                  <Badge variant={row.marginPercent < 0 ? 'destructive' : row.marginPercent < 35 ? 'secondary' : 'default'}>
                    {row.marginPercent < 0 ? 'Verlust' : row.marginPercent < 35 ? 'Beobachten' : 'Stark'}
                  </Badge>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                  Keine Angebote mit Aktivität im gewählten Zeitraum.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
