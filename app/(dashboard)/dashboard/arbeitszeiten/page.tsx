import { requireAdmin } from '@/lib/auth/guards'
import { getTeacherOverviewForPeriod } from './actions'
import { WorkTimeWorkspace } from './work-time-workspace'

export default async function AdminArbeitszeitenPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>
}) {
  // Schritt 10c: Genehmigung/Lohnsatzpflege/Monatsabschluss sind admin-only (Abschnitt 2.14).
  await requireAdmin()

  const params = await searchParams
  const now = new Date()
  const year = Number(params.year) || now.getFullYear()
  const month = Number(params.month) || now.getMonth() + 1

  const result = await getTeacherOverviewForPeriod(year, month)
  const rows = result.success && result.data ? result.data : []

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Arbeitszeiten der Lernpersonen</h1>
        <p className="text-muted-foreground mt-1">Geleistete Stunden prüfen, genehmigen und für die Lohnabrechnung abschliessen.</p>
      </div>
      <WorkTimeWorkspace year={year} month={month} rows={rows} />
    </div>
  )
}
