'use client'

// Schritt 10c: orchestriert WorkTimeOverview/PayrollReviewPanel sowie den Monats-Filter und den
// Monatsabschluss aus Layout_Admin_Zeiterfassung.html.

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { Badge } from '@/app/components/ui/badge'
import { WorkTimeOverview } from '@/app/components/kurse-admin/work-time-overview'
import { PayrollReviewPanel } from '@/app/components/kurse-admin/payroll-review-panel'
import type { WorkEntryDB, TeacherRateAgreementDB, PayrollPeriodDB } from '@/types/kurs-arbeitszeit'
import {
  getEntriesForTeacherInPeriod,
  getCurrentRateAgreement,
  getPayrollPeriodStatus,
  closePayrollPeriodAction,
  type TeacherOverviewRow,
} from './actions'

const MONTH_LABELS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
]

const PERIOD_STATUS_LABELS: Record<'open' | 'review' | 'locked', string> = {
  open: 'offen',
  review: 'in Prüfung',
  locked: 'abgeschlossen',
}

export function WorkTimeWorkspace({
  year,
  month,
  rows,
}: {
  year: number
  month: number
  rows: TeacherOverviewRow[]
}) {
  const router = useRouter()
  const [activeTeacherId, setActiveTeacherId] = useState<string | null>(rows[0]?.teacherId ?? null)
  const [entries, setEntries] = useState<WorkEntryDB[]>([])
  const [rate, setRate] = useState<TeacherRateAgreementDB | null>(null)
  const [period, setPeriod] = useState<PayrollPeriodDB | null>(null)
  const [loading, startLoadingTransition] = useTransition()
  const [closeState, setCloseState] = useState<'idle' | 'closing' | 'error'>('idle')
  const [closeMessage, setCloseMessage] = useState('')

  useEffect(() => {
    startLoadingTransition(async () => {
      const [periodResult] = await Promise.all([getPayrollPeriodStatus(year, month)])
      if (periodResult.success) setPeriod(periodResult.data ?? null)
    })
  }, [year, month, startLoadingTransition])

  useEffect(() => {
    if (!activeTeacherId) return
    startLoadingTransition(async () => {
      const [entriesResult, rateResult] = await Promise.all([
        getEntriesForTeacherInPeriod(activeTeacherId, year, month),
        getCurrentRateAgreement(activeTeacherId),
      ])
      if (entriesResult.success && entriesResult.data) setEntries(entriesResult.data)
      if (rateResult.success) setRate(rateResult.data ?? null)
    })
  }, [activeTeacherId, year, month, startLoadingTransition])

  const handleYearMonthChange = (newYear: number, newMonth: number) => {
    router.push(`/dashboard/arbeitszeiten?year=${newYear}&month=${newMonth}`)
  }

  const handleClosePeriod = async () => {
    setCloseState('closing')
    setCloseMessage('')
    const result = await closePayrollPeriodAction(year, month)
    if (result.success) {
      setCloseState('idle')
      setCloseMessage(result.message)
      router.refresh()
    } else {
      setCloseState('error')
      setCloseMessage(result.error)
    }
  }

  const activeTeacher = rows.find((r) => r.teacherId === activeTeacherId)
  const totalPayroll = rows.reduce((sum, r) => sum + r.payrollEstimateRappen, 0)
  const totalPending = rows.reduce((sum, r) => sum + r.pendingCount, 0)

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-border bg-card p-5 flex flex-wrap items-end gap-4 justify-between">
        <div className="flex gap-3 items-end flex-wrap">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Jahr</label>
            <select
              value={year}
              onChange={(e) => handleYearMonthChange(Number(e.target.value), month)}
              className="h-10 px-3 rounded-lg border border-border bg-background text-sm"
            >
              {[year - 1, year, year + 1].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Monat</label>
            <select
              value={month}
              onChange={(e) => handleYearMonthChange(year, Number(e.target.value))}
              className="h-10 px-3 rounded-lg border border-border bg-background text-sm"
            >
              {MONTH_LABELS.map((label, index) => (
                <option key={label} value={index + 1}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <Badge variant={period?.status === 'locked' ? 'default' : 'secondary'}>
            {MONTH_LABELS[month - 1]} {year} · {PERIOD_STATUS_LABELS[period?.status ?? 'open']}
          </Badge>
        </div>
        <Button
          type="button"
          disabled={closeState === 'closing' || period?.status === 'locked'}
          onClick={handleClosePeriod}
        >
          {closeState === 'closing' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Monat abschliessen
        </Button>
      </section>

      {closeMessage && (
        <div className={`rounded-xl border p-3 text-sm ${closeState === 'error' ? 'border-destructive/50 bg-destructive/10 text-destructive' : 'border-secondary/50 bg-secondary/10'}`}>
          {closeMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <small className="font-mono text-[10px] uppercase text-muted-foreground">Offen</small>
          <strong className="block font-serif text-2xl mt-1">{totalPending}</strong>
          <span className="text-xs text-muted-foreground">Einträge zu prüfen</span>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <small className="font-mono text-[10px] uppercase text-muted-foreground">Lohnprognose</small>
          <strong className="block font-serif text-2xl mt-1">CHF {(totalPayroll / 100).toLocaleString('de-CH', { maximumFractionDigits: 0 })}</strong>
          <span className="text-xs text-muted-foreground">genehmigte Zeit × vereinbarter Satz</span>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <small className="font-mono text-[10px] uppercase text-muted-foreground">Lernpersonen</small>
          <strong className="block font-serif text-2xl mt-1">{rows.length}</strong>
          <span className="text-xs text-muted-foreground">mit Aktivität</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_330px] gap-5 items-start">
        <WorkTimeOverview rows={rows} activeTeacherId={activeTeacherId} onSelect={setActiveTeacherId} />
        {activeTeacher ? (
          loading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm p-6">
              <Loader2 className="h-4 w-4 animate-spin" /> Lädt …
            </div>
          ) : (
            <PayrollReviewPanel teacherName={activeTeacher.name} teacherId={activeTeacher.teacherId} entries={entries} currentRate={rate} />
          )
        ) : (
          <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
            Keine Lehrpersonen mit Aktivität in diesem Monat.
          </div>
        )}
      </div>
    </div>
  )
}
