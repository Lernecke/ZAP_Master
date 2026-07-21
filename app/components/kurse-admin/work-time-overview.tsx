'use client'

// Schritt 10c: "Übersicht Lernpersonen"-Panel aus Layout_Admin_Zeiterfassung.html. "Geplant"/
// "Abweichung" entfallen (siehe Kommentar in types/kurs-arbeitszeit.ts).

import { useState } from 'react'
import { Badge } from '@/app/components/ui/badge'
import type { TeacherOverviewRow } from '@/app/(dashboard)/dashboard/arbeitszeiten/actions'

function formatHours(minutes: number): string {
  return (minutes / 60).toLocaleString('de-CH', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' h'
}

function formatChf(rappen: number): string {
  return 'CHF ' + (rappen / 100).toLocaleString('de-CH', { maximumFractionDigits: 0 })
}

export function WorkTimeOverview({
  rows,
  activeTeacherId,
  onSelect,
}: {
  rows: TeacherOverviewRow[]
  activeTeacherId: string | null
  onSelect: (teacherId: string) => void
}) {
  const [search, setSearch] = useState('')
  const filtered = rows.filter((row) => row.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <section className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Übersicht Lernpersonen</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Freigabestatus je Person für den gewählten Monat</p>
        </div>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Lernperson suchen …"
          className="h-10 w-52 px-3 rounded-lg border border-border bg-background text-sm"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground font-mono">
              <th className="text-left px-4 py-2.5">Lernperson</th>
              <th className="text-right px-4 py-2.5">Eingereicht</th>
              <th className="text-right px-4 py-2.5">Genehmigt</th>
              <th className="text-right px-4 py-2.5">Lohnkosten</th>
              <th className="text-left px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr
                key={row.teacherId}
                onClick={() => onSelect(row.teacherId)}
                className={`cursor-pointer border-t border-border hover:bg-muted/40 ${row.teacherId === activeTeacherId ? 'bg-muted/40 shadow-[inset_3px_0_0_0_var(--secondary)]' : ''}`}
              >
                <td className="px-4 py-3 font-medium text-foreground">{row.name}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatHours(row.submittedMinutes)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatHours(row.approvedMinutes)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatChf(row.payrollEstimateRappen)}</td>
                <td className="px-4 py-3">
                  {row.pendingCount > 0 ? (
                    <Badge variant="secondary">{row.pendingCount} zu prüfen</Badge>
                  ) : row.submittedMinutes > 0 ? (
                    <Badge variant="default">Genehmigt</Badge>
                  ) : (
                    <Badge variant="outline">Entwurf</Badge>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  Keine Treffer.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
