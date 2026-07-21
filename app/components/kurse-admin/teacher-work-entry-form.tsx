'use client'

// Schritt 10c (Abschnitt 3): TeacherWorkEntryForm -- Lehrpersonen-Dashboard fuer /arbeitszeiten.
// Kein eigenes Mockup; folgt denselben Formular-Konventionen wie kurs-formular.tsx.

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { Badge } from '@/app/components/ui/badge'
import {
  workEntryFormSchema,
  WORK_ACTIVITY_TYPE_LABELS,
  WORK_ENTRY_STATUS_LABELS,
  type WorkEntryFormInput,
  type WorkEntryDB,
} from '@/types/kurs-arbeitszeit'
import {
  getOwnAssignedSessions,
  saveWorkEntryAction,
  submitWorkEntryAction,
  type AssignedSessionOption,
} from '@/app/(dashboard)/arbeitszeiten/actions'

const inputClass =
  'w-full h-11 px-4 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors'
const labelClass = 'block text-sm font-medium text-foreground mb-2'

function formatHours(minutes: number): string {
  return (minutes / 60).toLocaleString('de-CH', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' h'
}

export function TeacherWorkEntryForm({ initialEntries }: { initialEntries: WorkEntryDB[] }) {
  const router = useRouter()
  const [sessions, setSessions] = useState<AssignedSessionOption[]>([])
  const [submitState, setSubmitState] = useState<'idle' | 'saving' | 'error'>('idle')
  const [message, setMessage] = useState('')

  useEffect(() => {
    getOwnAssignedSessions().then((result) => {
      if (result.success && result.data) setSessions(result.data)
    })
  }, [])

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<WorkEntryFormInput>({
    resolver: zodResolver(workEntryFormSchema) as never,
    defaultValues: { activityType: 'course_teaching', workDate: '', durationMinutes: 45, sessionId: null, note: '' },
  })

  const activityType = watch('activityType')

  const onSubmit = async (data: WorkEntryFormInput) => {
    setSubmitState('saving')
    setMessage('')
    const result = await saveWorkEntryAction(null, null, data)
    if (result.success) {
      setSubmitState('idle')
      setMessage(result.message)
      reset({ activityType: 'course_teaching', workDate: '', durationMinutes: 45, sessionId: null, note: '' })
      router.refresh()
    } else {
      setSubmitState('error')
      setMessage(result.error)
    }
  }

  const onSubmitEntry = async (entry: WorkEntryDB) => {
    setSubmitState('saving')
    const result = await submitWorkEntryAction(entry.id, entry.version)
    if (result.success) {
      setSubmitState('idle')
      setMessage(result.message)
      router.refresh()
    } else {
      setSubmitState('error')
      setMessage(result.error)
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <h2 className="text-lg font-semibold text-foreground">Neuer Eintrag</h2>
        {message && (
          <div className={`rounded-xl border p-3 text-sm ${submitState === 'error' ? 'border-destructive/50 bg-destructive/10 text-destructive' : 'border-secondary/50 bg-secondary/10'}`}>
            {message}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Tätigkeit *</label>
            <select {...register('activityType')} className={inputClass}>
              {Object.entries(WORK_ACTIVITY_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          {activityType === 'course_teaching' && (
            <div>
              <label className={labelClass}>Kursgruppe *</label>
              <select {...register('sessionId', { valueAsNumber: true })} className={inputClass}>
                <option value="">— wählen —</option>
                {sessions.map((s) => (
                  <option key={s.kursId} value={s.kursId}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className={labelClass}>Datum *</label>
            <input type="date" {...register('workDate')} className={inputClass} />
            {errors.workDate && <p className="mt-1.5 text-sm text-destructive">{errors.workDate.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Dauer (Minuten) *</label>
            <input type="number" min={1} max={720} {...register('durationMinutes', { valueAsNumber: true })} className={inputClass} />
            {errors.durationMinutes && <p className="mt-1.5 text-sm text-destructive">{errors.durationMinutes.message}</p>}
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Notiz</label>
            <textarea rows={2} {...register('note')} className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground resize-none" />
          </div>
        </div>
        <Button type="submit" disabled={submitState === 'saving'}>
          {submitState === 'saving' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Als Entwurf speichern
        </Button>
      </form>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Meine Einträge</h2>
        </div>
        <div className="divide-y divide-border">
          {initialEntries.length === 0 && <p className="p-6 text-sm text-muted-foreground">Noch keine Einträge erfasst.</p>}
          {initialEntries.map((entry) => (
            <div key={entry.id} className="p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {WORK_ACTIVITY_TYPE_LABELS[entry.activity_type]} · {formatHours(entry.duration_minutes)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(entry.work_date + 'T00:00:00').toLocaleDateString('de-CH')}
                  {entry.note ? ` · ${entry.note}` : ''}
                </p>
                {entry.status === 'rejected' && entry.rejection_reason && (
                  <p className="text-xs text-destructive mt-1">Zurückgewiesen: {entry.rejection_reason}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={entry.status === 'approved' || entry.status === 'locked' ? 'default' : entry.status === 'rejected' ? 'destructive' : 'secondary'}>
                  {WORK_ENTRY_STATUS_LABELS[entry.status]}
                </Badge>
                {(entry.status === 'draft' || entry.status === 'rejected') && (
                  <Button size="sm" variant="outline" onClick={() => onSubmitEntry(entry)} disabled={submitState === 'saving'}>
                    Einreichen
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
