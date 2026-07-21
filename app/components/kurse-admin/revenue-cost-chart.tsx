// Schritt 10d: "Jahresverlauf"-Panel aus Layout_Admin_Finanzcockpit.html -- reines CSS-Balkendiagramm
// wie im Mockup, keine Chart-Bibliothek noetig fuer 12 Monatswerte.

import type { MonthlyPoint } from '@/app/(dashboard)/dashboard/finanzen/actions'

const MONTH_LABELS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

export function RevenueCostChart({ points }: { points: MonthlyPoint[] }) {
  const maxValue = Math.max(1, ...points.map((p) => Math.max(p.revenueRappen, p.costRappen)))

  return (
    <section className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">Jahresverlauf</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Einnahmen und angefallene Kosten je Monat</p>
      </div>
      <div className="grid grid-cols-12 gap-1.5 items-end px-5 pt-5 pb-3 h-56 border-b border-border">
        {points.map((point) => (
          <div key={point.month} className="h-full flex flex-col justify-end items-center gap-1.5">
            <div className="w-full flex items-end justify-center gap-0.5 h-[85%]">
              <span
                className="w-[45%] rounded-t bg-secondary min-h-[2px]"
                style={{ height: `${(point.revenueRappen / maxValue) * 100}%` }}
                title={`Einnahmen ${MONTH_LABELS[point.month - 1]}: CHF ${(point.revenueRappen / 100).toLocaleString('de-CH', { maximumFractionDigits: 0 })}`}
              />
              <span
                className="w-[45%] rounded-t bg-accent min-h-[2px]"
                style={{ height: `${(point.costRappen / maxValue) * 100}%` }}
                title={`Kosten ${MONTH_LABELS[point.month - 1]}: CHF ${(point.costRappen / 100).toLocaleString('de-CH', { maximumFractionDigits: 0 })}`}
              />
            </div>
            <small className="font-mono text-[9px] text-muted-foreground">{MONTH_LABELS[point.month - 1]}</small>
          </div>
        ))}
      </div>
      <div className="flex gap-5 px-5 py-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-secondary" /> Einnahmen
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-accent" /> Kosten
        </span>
      </div>
    </section>
  )
}
