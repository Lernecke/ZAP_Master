'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { 
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle,
  Plus,
  X
} from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { kursFormSchema, type KursFormInput, type KursDB } from '@/types/kurs-form'
import { FACH_LABELS } from '@/types/kurs'
import { createKurs, updateKurs } from './actions'

interface KursFormularProps {
  kurs?: KursDB
  modus: 'erstellen' | 'bearbeiten'
}

const KLASSENSTUFEN_OPTIONEN = ['5. Klasse', '6. Klasse', '7. Klasse', '8. Klasse', '9. Klasse']

export function KursFormular({ kurs, modus }: KursFormularProps) {
  const router = useRouter()
  const [submitState, setSubmitState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [serverMessage, setServerMessage] = useState('')
  const [highlightInput, setHighlightInput] = useState('')

  const form = useForm<KursFormInput>({
    resolver: zodResolver(kursFormSchema) as never,
    defaultValues: kurs ? {
      name: kurs.name,
      fach: kurs.fach,
      beschreibung: kurs.beschreibung,
      detail_beschreibung: kurs.detail_beschreibung || '',
      start_datum: kurs.start_datum,
      end_datum: kurs.end_datum,
      uhrzeit: kurs.uhrzeit,
      ort: kurs.ort,
      preis: kurs.preis,
      max_teilnehmer: kurs.max_teilnehmer,
      klassenstufen: kurs.klassenstufen,
      lehrer: kurs.lehrer,
      highlights: kurs.highlights,
      ist_aktiv: kurs.ist_aktiv,
    } : {
      klassenstufen: ['5. Klasse', '6. Klasse'],
      highlights: [],
      ist_aktiv: true,
      max_teilnehmer: 12,
      preis: 450,
    },
  })

  const { register, handleSubmit, formState: { errors }, setError, watch, setValue } = form

  const highlights = watch('highlights') || []
  const klassenstufen = watch('klassenstufen') || []

  const addHighlight = () => {
    if (highlightInput.trim()) {
      setValue('highlights', [...highlights, highlightInput.trim()])
      setHighlightInput('')
    }
  }

  const removeHighlight = (index: number) => {
    setValue('highlights', highlights.filter((_, i) => i !== index))
  }

  const toggleKlassenstufe = (stufe: string) => {
    if (klassenstufen.includes(stufe)) {
      setValue('klassenstufen', klassenstufen.filter(k => k !== stufe))
    } else {
      setValue('klassenstufen', [...klassenstufen, stufe])
    }
  }

  const onSubmit = async (data: KursFormInput) => {
    setSubmitState('loading')
    setServerMessage('')

    const result = modus === 'erstellen' 
      ? await createKurs(data)
      : await updateKurs(kurs!.id, data)

    if (result.success) {
      setSubmitState('success')
      setServerMessage(result.message)
      setTimeout(() => {
        router.push('/dashboard/kurse')
      }, 1000)
    } else {
      setSubmitState('error')
      setServerMessage(result.error)
      
      if (result.fieldErrors) {
        Object.entries(result.fieldErrors).forEach(([field, messages]) => {
          setError(field as keyof KursFormInput, {
            message: (messages as string[])[0],
          })
        })
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Grunddaten */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <h2 className="text-lg font-semibold text-foreground">Grunddaten</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Name */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-foreground mb-2">
              Kursname *
            </label>
            <input
              type="text"
              {...register('name')}
              placeholder="z.B. Mathematik Intensiv – Frühjahr 2026"
              className="w-full h-11 px-4 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
            />
            {errors.name && (
              <p className="mt-1.5 text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Fach */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Fach *
            </label>
            <select
              {...register('fach')}
              className="w-full h-11 px-4 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
            >
              <option value="">— Bitte wählen —</option>
              {Object.entries(FACH_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {errors.fach && (
              <p className="mt-1.5 text-sm text-destructive">{errors.fach.message}</p>
            )}
          </div>

          {/* Lehrer */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Kursleitung *
            </label>
            <input
              type="text"
              {...register('lehrer')}
              placeholder="z.B. Dr. Maria Schneider"
              className="w-full h-11 px-4 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
            />
            {errors.lehrer && (
              <p className="mt-1.5 text-sm text-destructive">{errors.lehrer.message}</p>
            )}
          </div>

          {/* Kurzbeschreibung */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-foreground mb-2">
              Kurzbeschreibung *
            </label>
            <textarea
              {...register('beschreibung')}
              rows={2}
              placeholder="Kurze Beschreibung für die Übersicht (max. 300 Zeichen)"
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors resize-none"
            />
            {errors.beschreibung && (
              <p className="mt-1.5 text-sm text-destructive">{errors.beschreibung.message}</p>
            )}
          </div>

          {/* Detailbeschreibung */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-foreground mb-2">
              Detailbeschreibung
            </label>
            <textarea
              {...register('detail_beschreibung')}
              rows={6}
              placeholder="Ausführliche Beschreibung mit Inhalten, Methoden, etc."
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors resize-none"
            />
            {errors.detail_beschreibung && (
              <p className="mt-1.5 text-sm text-destructive">{errors.detail_beschreibung.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Termin & Ort */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <h2 className="text-lg font-semibold text-foreground">Termin & Ort</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Startdatum */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Startdatum *
            </label>
            <input
              type="date"
              {...register('start_datum')}
              className="w-full h-11 px-4 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
            />
            {errors.start_datum && (
              <p className="mt-1.5 text-sm text-destructive">{errors.start_datum.message}</p>
            )}
          </div>

          {/* Enddatum */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Enddatum *
            </label>
            <input
              type="date"
              {...register('end_datum')}
              className="w-full h-11 px-4 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
            />
            {errors.end_datum && (
              <p className="mt-1.5 text-sm text-destructive">{errors.end_datum.message}</p>
            )}
          </div>

          {/* Uhrzeit */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Uhrzeit *
            </label>
            <input
              type="text"
              {...register('uhrzeit')}
              placeholder="z.B. 09:00 - 12:00"
              className="w-full h-11 px-4 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
            />
            {errors.uhrzeit && (
              <p className="mt-1.5 text-sm text-destructive">{errors.uhrzeit.message}</p>
            )}
          </div>

          {/* Ort */}
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-foreground mb-2">
              Ort *
            </label>
            <input
              type="text"
              {...register('ort')}
              placeholder="z.B. Lernzentrum Bern, Bahnhofstrasse 12"
              className="w-full h-11 px-4 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
            />
            {errors.ort && (
              <p className="mt-1.5 text-sm text-destructive">{errors.ort.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Kapazität & Preis */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <h2 className="text-lg font-semibold text-foreground">Kapazität & Preis</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Max Teilnehmer */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Maximale Teilnehmer *
            </label>
            <input
              type="number"
              {...register('max_teilnehmer', { valueAsNumber: true })}
              min={1}
              max={50}
              className="w-full h-11 px-4 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
            />
            {errors.max_teilnehmer && (
              <p className="mt-1.5 text-sm text-destructive">{errors.max_teilnehmer.message}</p>
            )}
          </div>

          {/* Preis */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Preis (CHF) *
            </label>
            <input
              type="number"
              {...register('preis', { valueAsNumber: true })}
              min={0}
              step={10}
              className="w-full h-11 px-4 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
            />
            {errors.preis && (
              <p className="mt-1.5 text-sm text-destructive">{errors.preis.message}</p>
            )}
          </div>

          {/* Klassenstufen */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-foreground mb-2">
              Klassenstufen *
            </label>
            <div className="flex flex-wrap gap-2">
              {KLASSENSTUFEN_OPTIONEN.map((stufe) => (
                <button
                  key={stufe}
                  type="button"
                  onClick={() => toggleKlassenstufe(stufe)}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                    klassenstufen.includes(stufe)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-foreground border-border hover:bg-muted'
                  }`}
                >
                  {stufe}
                </button>
              ))}
            </div>
            {errors.klassenstufen && (
              <p className="mt-1.5 text-sm text-destructive">{errors.klassenstufen.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Highlights */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <h2 className="text-lg font-semibold text-foreground">Highlights</h2>
        
        <div className="flex gap-2">
          <input
            type="text"
            value={highlightInput}
            onChange={(e) => setHighlightInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addHighlight())}
            placeholder="z.B. Kleine Gruppen"
            className="flex-1 h-11 px-4 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
          />
          <Button type="button" onClick={addHighlight} variant="outline" className="rounded-xl">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {highlights.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {highlights.map((h, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-primary/10 text-primary"
              >
                {h}
                <button
                  type="button"
                  onClick={() => removeHighlight(i)}
                  className="hover:text-primary/70"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Aktiv-Status */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            {...register('ist_aktiv')}
            className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
          />
          <div>
            <span className="font-medium text-foreground">Kurs aktiv</span>
            <p className="text-sm text-muted-foreground">
              Nur aktive Kurse werden auf der öffentlichen Kursseite angezeigt.
            </p>
          </div>
        </label>
      </div>

      {/* Server Error */}
      {submitState === 'error' && serverMessage && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
          <p className="text-sm text-destructive">{serverMessage}</p>
        </div>
      )}

      {/* Success */}
      {submitState === 'success' && serverMessage && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800">
          <p className="text-sm text-green-700 dark:text-green-400">{serverMessage}</p>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-3">
        <Link href="/dashboard/kurse" className="flex-1">
          <Button type="button" variant="outline" className="w-full rounded-xl">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Abbrechen
          </Button>
        </Link>
        <Button 
          type="submit" 
          className="flex-1 rounded-xl"
          disabled={submitState === 'loading'}
        >
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
