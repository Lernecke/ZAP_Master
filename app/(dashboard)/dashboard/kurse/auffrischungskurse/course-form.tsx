'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { ArrowLeft, Save, Loader2, AlertCircle, Trash2 } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { courseFormSchema, COURSE_LOCATIONS, type CourseFormInput, type CourseDB } from '@/types/auffrischungskurs'
import { saveCourseAction, deleteCourseAction } from './actions'

interface CourseFormProps {
  course?: CourseDB
  modus: 'erstellen' | 'bearbeiten'
}

export function CourseForm({ course, modus }: CourseFormProps) {
  const router = useRouter()
  const [submitState, setSubmitState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [serverMessage, setServerMessage] = useState('')
  const [deleteState, setDeleteState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [deleteError, setDeleteError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<CourseFormInput>({
    resolver: zodResolver(courseFormSchema) as never,
    defaultValues: course
      ? {
          title: course.title ?? '',
          description: course.description ?? '',
          priceChf: course.price ?? 0,
          location: (course.location as CourseFormInput['location']) ?? COURSE_LOCATIONS[0],
          paymentMethod: course.payment_method ?? 'Bar vor Ort',
        }
      : {
          location: COURSE_LOCATIONS[0],
          paymentMethod: 'Bar vor Ort',
        },
  })

  const onSubmit = async (data: CourseFormInput) => {
    setSubmitState('loading')
    setServerMessage('')

    const result = modus === 'erstellen' ? await saveCourseAction(null, data) : await saveCourseAction(course!.id, data)

    if (result.success) {
      setSubmitState('success')
      setServerMessage(result.message)
      setTimeout(() => {
        router.push(modus === 'erstellen' ? '/dashboard/kurse/auffrischungskurse' : `/dashboard/kurse/auffrischungskurse/${course!.id}`)
        router.refresh()
      }, 800)
    } else {
      setSubmitState('error')
      setServerMessage(result.error)

      if (result.fieldErrors) {
        Object.entries(result.fieldErrors).forEach(([field, messages]) => {
          setError(field as keyof CourseFormInput, { message: messages[0] })
        })
      }
    }
  }

  const onDelete = async () => {
    if (!course) return
    setDeleteState('loading')
    setDeleteError('')
    const result = await deleteCourseAction(course.id)
    if (result.success) {
      router.push('/dashboard/kurse/auffrischungskurse')
      router.refresh()
    } else {
      setDeleteState('error')
      setDeleteError(result.error)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <h2 className="text-lg font-semibold text-foreground">Kursangaben</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-foreground mb-2">Titel *</label>
            <input
              type="text"
              {...register('title')}
              placeholder="z.B. Auffrischungskurs Mathematik"
              className="w-full h-11 px-4 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
            />
            {errors.title && <p className="mt-1.5 text-sm text-destructive">{errors.title.message}</p>}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-foreground mb-2">Beschreibung *</label>
            <textarea
              {...register('description')}
              rows={3}
              placeholder="Kurzbeschreibung des Kurses"
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors resize-none"
            />
            {errors.description && <p className="mt-1.5 text-sm text-destructive">{errors.description.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Preis (CHF) *</label>
            <input
              type="number"
              {...register('priceChf', { valueAsNumber: true })}
              min={0}
              step={10}
              className="w-full h-11 px-4 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
            />
            {errors.priceChf && <p className="mt-1.5 text-sm text-destructive">{errors.priceChf.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Zahlungsart *</label>
            <input
              type="text"
              {...register('paymentMethod')}
              placeholder="z.B. Bar vor Ort"
              className="w-full h-11 px-4 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
            />
            {errors.paymentMethod && <p className="mt-1.5 text-sm text-destructive">{errors.paymentMethod.message}</p>}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-foreground mb-2">Standort *</label>
            <select
              {...register('location')}
              className="w-full h-11 px-4 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
            >
              {COURSE_LOCATIONS.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
            {errors.location && <p className="mt-1.5 text-sm text-destructive">{errors.location.message}</p>}
          </div>
        </div>
      </div>

      {submitState === 'error' && serverMessage && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
          <p className="text-sm text-destructive">{serverMessage}</p>
        </div>
      )}

      {submitState === 'success' && serverMessage && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800">
          <p className="text-sm text-green-700 dark:text-green-400">{serverMessage}</p>
        </div>
      )}

      {deleteState === 'error' && deleteError && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
          <p className="text-sm text-destructive">{deleteError}</p>
        </div>
      )}

      <div className="flex gap-3">
        <Link href="/dashboard/kurse/auffrischungskurse" className="flex-1">
          <Button type="button" variant="outline" className="w-full rounded-xl">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Abbrechen
          </Button>
        </Link>
        {modus === 'bearbeiten' && (
          <Button
            type="button"
            variant="outline"
            className="rounded-xl text-destructive border-destructive/50 hover:bg-destructive/10"
            disabled={deleteState === 'loading'}
            onClick={onDelete}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Kurs löschen
          </Button>
        )}
        <Button type="submit" className="flex-1 rounded-xl" disabled={submitState === 'loading'}>
          {submitState === 'loading' ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Wird gespeichert...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {modus === 'erstellen' ? 'Kurs erstellen' : 'Änderungen speichern'}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
