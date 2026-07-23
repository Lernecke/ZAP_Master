'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2, AlertCircle } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { occurrenceFormSchema, type OccurrenceFormInput, type CourseOccurrenceDB } from '@/types/auffrischungskurs'
import { saveOccurrenceAction, deleteOccurrenceAction } from './actions'

interface OccurrenceListProps {
  courseId: number
  occurrences: CourseOccurrenceDB[]
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('de-CH', { dateStyle: 'medium', timeStyle: 'short' })
}

export function OccurrenceList({ courseId, occurrences }: OccurrenceListProps) {
  const router = useRouter()
  const [serverError, setServerError] = useState('')
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setError,
  } = useForm<OccurrenceFormInput>({
    resolver: zodResolver(occurrenceFormSchema) as never,
  })

  const onSubmit = async (data: OccurrenceFormInput) => {
    setServerError('')
    const result = await saveOccurrenceAction(courseId, null, data)
    if (result.success) {
      reset()
      router.refresh()
    } else {
      setServerError(result.error)
      if (result.fieldErrors) {
        Object.entries(result.fieldErrors).forEach(([field, messages]) => {
          setError(field as keyof OccurrenceFormInput, { message: messages[0] })
        })
      }
    }
  }

  const onDelete = async (occurrenceId: number) => {
    setPendingDeleteId(occurrenceId)
    setServerError('')
    const result = await deleteOccurrenceAction(courseId, occurrenceId)
    setPendingDeleteId(null)
    if (result.success) {
      router.refresh()
    } else {
      setServerError(result.error)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
      <h2 className="text-lg font-semibold text-foreground">Termine</h2>
      <p className="text-sm text-muted-foreground">
        Derselbe Kurs kann mehrere Termine haben, z.B. am Vormittag und am Nachmittag, an
        verschiedenen Tagen.
      </p>

      {occurrences.length > 0 ? (
        <ul className="space-y-2">
          {occurrences.map((occurrence) => (
            <li
              key={occurrence.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3"
            >
              <span className="text-sm text-foreground">
                {formatDateTime(occurrence.starts_at_utc)} – {formatDateTime(occurrence.ends_at_utc)}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-lg"
                disabled={pendingDeleteId === occurrence.id}
                onClick={() => onDelete(occurrence.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Noch keine Termine erfasst.</p>
      )}

      {serverError && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-sm text-destructive">{serverError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col sm:flex-row gap-3 items-start">
        <div className="flex-1 w-full">
          <label className="block text-xs font-medium text-muted-foreground mb-1">Start</label>
          <input
            type="datetime-local"
            {...register('startsAt')}
            className="w-full h-11 px-4 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
          />
          {errors.startsAt && <p className="mt-1 text-xs text-destructive">{errors.startsAt.message}</p>}
        </div>
        <div className="flex-1 w-full">
          <label className="block text-xs font-medium text-muted-foreground mb-1">Ende</label>
          <input
            type="datetime-local"
            {...register('endsAt')}
            className="w-full h-11 px-4 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
          />
          {errors.endsAt && <p className="mt-1 text-xs text-destructive">{errors.endsAt.message}</p>}
        </div>
        <Button type="submit" className="rounded-xl h-11 sm:mt-5" disabled={isSubmitting}>
          <Plus className="mr-2 h-4 w-4" />
          Termin hinzufügen
        </Button>
      </form>
    </div>
  )
}
