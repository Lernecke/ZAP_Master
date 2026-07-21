'use client'

// Schritt 10c: "Ausgewählte Lernperson"-Aside aus Layout_Admin_Zeiterfassung.html --
// Lohnvereinbarung pflegen, Zeiten genehmigen/zurückweisen.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { Badge } from '@/app/components/ui/badge'
import { WORK_ACTIVITY_TYPE_LABELS, WORK_ENTRY_STATUS_LABELS, type WorkEntryDB, type TeacherRateAgreementDB } from '@/types/kurs-arbeitszeit'
import { saveRateAgreementAction, approveWorkEntryAction, rejectWorkEntryAction } from '@/app/(dashboard)/dashboard/arbeitszeiten/actions'

function formatHours(minutes: number): string {
  return (minutes / 60).toLocaleString('de-CH', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' h'
}

export function PayrollReviewPanel({
  teacherName,
  teacherId,
  entries,
  currentRate,
}: {
  teacherName: string
  teacherId: string
  entries: WorkEntryDB[]
  currentRate: TeacherRateAgreementDB | null
}) {
  const router = useRouter()
  const [hourlyRate, setHourlyRate] = useState(currentRate ? String(currentRate.hourly_rate_rappen / 100) : '')
  const [validFrom, setValidFrom] = useState(new Date().toISOString().slice(0, 10))
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [state, setState] = useState<'idle' | 'saving' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const pending = entries.filter((e) => e.status === 'submitted')

  const handleSaveRate = async () => {
    const rate = Number(hourlyRate)
    if (!rate || !validFrom) {
      setState('error')
      setMessage('Stundensatz und Gültigkeitsdatum sind erforderlich.')
      return
    }
    setState('saving')
    const result = await saveRateAgreementAction(teacherId, { hourlyRateChf: rate, validFrom })
    if (result.success) {
      setState('idle')
      setMessage(result.message)
      router.refresh()
    } else {
      setState('error')
      setMessage(result.error)
    }
  }

  const handleApprove = async (entry: WorkEntryDB) => {
    setState('saving')
    const result = await approveWorkEntryAction(entry.id, entry.version)
    setState(result.success ? 'idle' : 'error')
    setMessage(result.success ? result.message : result.error)
    if (result.success) router.refresh()
  }

  const handleReject = async (entry: WorkEntryDB) => {
    if (rejectingId !== entry.id) {
      setRejectingId(entry.id)
      return
    }
    setState('saving')
    const result = await rejectWorkEntryAction(entry.id, entry.version, rejectReason)
    setState(result.success ? 'idle' : 'error')
    setMessage(result.success ? result.message : result.error)
    if (result.success) {
      setRejectingId(null)
      setRejectReason('')
      router.refresh()
    }
  }

  return (
    <aside className="space-y-4">
      <section className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="p-5 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
          <small className="font-mono text-[10px] uppercase tracking-wide opacity-80">Ausgewählte Lernperson</small>
          <h2 className="text-lg mt-1">{teacherName}</h2>
        </div>
        <div className="p-4 space-y-3">
          {message && (
            <div className={`rounded-lg border p-2.5 text-xs ${state === 'error' ? 'border-destructive/50 bg-destructive/10 text-destructive' : 'border-secondary/50 bg-secondary/10'}`}>
              {message}
            </div>
          )}

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {entries.length === 0 && <p className="text-xs text-muted-foreground">Keine Einträge in diesem Monat.</p>}
            {entries.map((entry) => (
              <div key={entry.id} className="border border-border rounded-lg p-2.5 text-xs space-y-1.5">
                <div className="flex justify-between gap-2">
                  <strong className="text-foreground">
                    {WORK_ACTIVITY_TYPE_LABELS[entry.activity_type]} · {formatHours(entry.duration_minutes)}
                  </strong>
                  <Badge variant={entry.status === 'approved' || entry.status === 'locked' ? 'default' : entry.status === 'rejected' ? 'destructive' : 'secondary'}>
                    {WORK_ENTRY_STATUS_LABELS[entry.status]}
                  </Badge>
                </div>
                <p className="text-muted-foreground">{new Date(entry.work_date + 'T00:00:00').toLocaleDateString('de-CH')}</p>
                {entry.status === 'submitted' && (
                  <div className="pt-1.5">
                    {rejectingId === entry.id ? (
                      <div className="space-y-1.5">
                        <textarea
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="Begründung für Rückweisung"
                          rows={2}
                          className="w-full text-xs p-2 rounded-md border border-border bg-background resize-none"
                        />
                        <div className="grid grid-cols-2 gap-1.5">
                          <Button size="sm" variant="outline" onClick={() => setRejectingId(null)}>
                            Abbrechen
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleReject(entry)} disabled={state === 'saving'}>
                            Bestätigen
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => handleReject(entry)} disabled={state === 'saving'}>
                          Zurückweisen
                        </Button>
                        <Button size="sm" onClick={() => handleApprove(entry)} disabled={state === 'saving'}>
                          Genehmigen
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="border border-accent/40 bg-accent/10 rounded-lg p-3 space-y-2">
            <h3 className="text-xs font-bold text-foreground">Vereinbarter Lohn</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold mb-1">Stundensatz CHF</label>
                <input
                  type="number"
                  min={0}
                  step={0.05}
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  className="w-full h-9 px-2 rounded-md border border-border bg-background text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold mb-1">Gültig ab</label>
                <input
                  type="date"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                  className="w-full h-9 px-2 rounded-md border border-border bg-background text-xs"
                />
              </div>
            </div>
            <Button size="sm" variant="outline" className="w-full" onClick={handleSaveRate} disabled={state === 'saving'}>
              {state === 'saving' && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Neue Vereinbarung speichern
            </Button>
            <p className="text-[10px] text-muted-foreground">
              Nur Administratoren ändern Lohnsätze. Frühere Vereinbarungen und abgeschlossene Abrechnungen bleiben unverändert.
            </p>
          </div>

          {pending.length > 0 && (
            <p className="text-xs text-accent-foreground bg-accent/10 rounded-lg p-2">
              {pending.length} Eintrag/Einträge noch nicht genehmigt.
            </p>
          )}
        </div>
      </section>
    </aside>
  )
}
