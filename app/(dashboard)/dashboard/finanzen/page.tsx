import { requireAdmin } from '@/lib/auth/guards'
import { getYearKpis, getFinancialPeriodStatus } from './actions'
import { FinancialCockpit } from './financial-cockpit'

export default async function FinanzenPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>
}) {
  // Schritt 10d: das Finanz-Cockpit ist admin-only (Abschnitt 2.15).
  await requireAdmin()

  const params = await searchParams
  const year = Number(params.year) || new Date().getFullYear()

  const [kpisResult, periodResult] = await Promise.all([getYearKpis(year), getFinancialPeriodStatus(year)])

  if (!kpisResult.success || !kpisResult.data) {
    return (
      <div className="p-6 lg:p-8">
        <div className="rounded-2xl border border-destructive/50 bg-destructive/10 p-6 text-center text-destructive">
          {!kpisResult.success ? kpisResult.error : 'Kennzahlen konnten nicht geladen werden.'}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Finanz-Cockpit</h1>
        <p className="text-muted-foreground mt-1">Teilnehmer, Umsatz und Kosten über alle Angebote und Perioden.</p>
      </div>
      <FinancialCockpit year={year} kpis={kpisResult.data} period={periodResult.success ? periodResult.data ?? null : null} />
    </div>
  )
}
