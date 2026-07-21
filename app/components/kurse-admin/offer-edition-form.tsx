'use client'

// Schritt 10a: Grundlagen + Preise + Veröffentlichung aus Layout_Admin_Kursangebot_Maske.html,
// Abschnitte 1/2/4. "Interner Code" und "Distance Learning verfügbar" aus dem Mockup sind bewusst
// nicht übernommen -- OfferEdition (Abschnitt 2.12) und course_sessions besitzen dafür kein Feld;
// distanceLearningAvailable gehört zum öffentlichen CourseOffer-Marketingtyp, nicht zur admin-
// seitigen Edition. Kein erfundenes Schema-Feld für eine Mockup-Zeile ohne Typquelle.

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import {
  offerEditionFormSchema,
  type OfferEditionFormInput,
  type OfferEditionDB,
} from '@/types/kurs-edition'
import { saveEditionAction, publishEditionAction, archiveEditionAction } from '@/app/(dashboard)/dashboard/kurse/durchfuehrungen/actions'

const inputClass =
  'w-full h-11 px-4 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors'
const textareaClass =
  'w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors resize-none'
const labelClass = 'block text-sm font-medium text-foreground mb-2'
const errorClass = 'mt-1.5 text-sm text-destructive'

function defaultValuesFor(edition: OfferEditionDB | null): OfferEditionFormInput {
  if (!edition) {
    return {
      schoolYear: '',
      publicTitle: '',
      tagline: '',
      description: '',
      regularPriceChf: 0,
      earlyBirdEnabled: true,
      earlyBirdPriceChf: null,
      earlyBirdDeadline: null,
      registrationOpensAt: null,
      registrationClosesAt: null,
      status: 'draft',
    }
  }
  return {
    schoolYear: edition.school_year,
    publicTitle: edition.public_title,
    tagline: edition.tagline,
    description: edition.description,
    regularPriceChf: edition.regular_price_rappen / 100,
    earlyBirdEnabled: edition.early_bird_enabled,
    earlyBirdPriceChf: edition.early_bird_price_rappen != null ? edition.early_bird_price_rappen / 100 : null,
    earlyBirdDeadline: edition.early_bird_deadline,
    registrationOpensAt: edition.registration_opens_at?.slice(0, 16) ?? null,
    registrationClosesAt: edition.registration_closes_at?.slice(0, 16) ?? null,
    status: edition.status === 'archived' ? 'draft' : edition.status,
  }
}

export function OfferEditionForm({
  offerId,
  edition,
  onValuesChange,
  onSaved,
}: {
  offerId: number
  edition: OfferEditionDB | null
  onValuesChange?: (values: OfferEditionFormInput) => void
  onSaved: (edition: OfferEditionDB) => void
}) {
  const [submitState, setSubmitState] = useState<'idle' | 'saving' | 'publishing' | 'error'>('idle')
  const [serverMessage, setServerMessage] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setError,
    reset,
  } = useForm<OfferEditionFormInput>({
    resolver: zodResolver(offerEditionFormSchema) as never,
    defaultValues: defaultValuesFor(edition),
  })

  // Kontextwechsel (andere Edition geladen): Formular komplett neu befüllen statt alte Werte
  // stehen zu lassen (Abschnitt 1c: "Beim Kontextwechsel werden alle Felder aus der neuen Edition
  // geladen").
  useEffect(() => {
    reset(defaultValuesFor(edition))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edition?.id])

  useEffect(() => {
    if (!onValuesChange) return
    const subscription = watch((values) => onValuesChange(values as OfferEditionFormInput))
    return () => subscription.unsubscribe()
  }, [watch, onValuesChange])

  const earlyBirdEnabled = watch('earlyBirdEnabled')

  const onSave = async (data: OfferEditionFormInput) => {
    setSubmitState('saving')
    setServerMessage('')
    const result = await saveEditionAction(offerId, edition?.id ?? null, edition?.version ?? null, data)
    if (result.success && result.data) {
      setSubmitState('idle')
      setServerMessage(result.message)
      onSaved(result.data)
    } else if (!result.success) {
      setSubmitState('error')
      setServerMessage(result.error)
      if (result.fieldErrors) {
        Object.entries(result.fieldErrors).forEach(([field, messages]) => {
          setError(field as keyof OfferEditionFormInput, { message: messages[0] })
        })
      }
    }
  }

  const onPublish = handleSubmit(async (data) => {
    // Veröffentlichen speichert zuerst den aktuellen Formularstand, damit keine ungespeicherten
    // Änderungen live gehen, ohne im Entwurf gestanden zu haben.
    setSubmitState('publishing')
    setServerMessage('')
    const saveResult = await saveEditionAction(offerId, edition?.id ?? null, edition?.version ?? null, data)
    if (!saveResult.success || !saveResult.data) {
      setSubmitState('error')
      setServerMessage(!saveResult.success ? saveResult.error : 'Speichern fehlgeschlagen.')
      return
    }
    onSaved(saveResult.data)
    const publishResult = await publishEditionAction(offerId, saveResult.data.id, saveResult.data.version)
    if (publishResult.success && publishResult.data) {
      setSubmitState('idle')
      setServerMessage(publishResult.message)
      onSaved(publishResult.data)
    } else if (!publishResult.success) {
      setSubmitState('error')
      setServerMessage(publishResult.error)
    }
  })

  const onArchive = async () => {
    if (!edition) return
    setSubmitState('saving')
    const result = await archiveEditionAction(offerId, edition.id, edition.version)
    if (result.success && result.data) {
      setSubmitState('idle')
      setServerMessage(result.message)
      onSaved(result.data)
    } else if (!result.success) {
      setSubmitState('error')
      setServerMessage(result.error)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-6">
      {serverMessage && (
        <div
          className={`rounded-xl border p-4 text-sm ${
            submitState === 'error'
              ? 'border-destructive/50 bg-destructive/10 text-destructive'
              : 'border-secondary/50 bg-secondary/10 text-secondary-foreground'
          }`}
        >
          {serverMessage}
        </div>
      )}

      {/* 1 · Grundlagen */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-foreground">1 · Grundlagen</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Stabile Zuordnung und öffentliche Texte dieser Jahresdurchführung.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Schul-/Prüfungsjahr *</label>
            <input type="text" {...register('schoolYear')} placeholder="z.B. 2026/27" className={inputClass} />
            {errors.schoolYear && <p className={errorClass}>{errors.schoolYear.message}</p>}
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Öffentlicher Titel *</label>
            <input type="text" {...register('publicTitle')} className={inputClass} />
            {errors.publicTitle && <p className={errorClass}>{errors.publicTitle.message}</p>}
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Kachel-Tagline *</label>
            <input type="text" {...register('tagline')} className={inputClass} />
            <p className="text-xs text-muted-foreground mt-1.5">
              Erscheint auf Hauptseite und Kursdetailseite aus derselben Datenquelle.
            </p>
            {errors.tagline && <p className={errorClass}>{errors.tagline.message}</p>}
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Kurzbeschreibung *</label>
            <textarea rows={3} {...register('description')} className={textareaClass} />
            {errors.description && <p className={errorClass}>{errors.description.message}</p>}
          </div>
        </div>
      </div>

      {/* 2 · Preise */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-foreground">2 · Preise</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Preisänderungen gelten nur für neue Buchungen dieser Durchführung.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Regulärer Preis (CHF) *</label>
            <input type="number" min={0} step={1} {...register('regularPriceChf', { valueAsNumber: true })} className={inputClass} />
            {errors.regularPriceChf && <p className={errorClass}>{errors.regularPriceChf.message}</p>}
          </div>
          <label className="flex gap-3 items-start border border-border rounded-xl p-4 bg-muted/30">
            <input type="checkbox" className="mt-1" {...register('earlyBirdEnabled')} />
            <span>
              <strong className="block text-sm text-foreground">Frühbucherpreis aktivieren</strong>
              <small className="text-xs text-muted-foreground">
                Für Halbjahreskurse und Intensivkurse/Lerncamps empfohlen; für Prüfungssimulation und
                Selbststudium standardmässig deaktiviert.
              </small>
            </span>
          </label>
          {earlyBirdEnabled && (
            <>
              <div>
                <label className={labelClass}>Frühbucherpreis (CHF) *</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  {...register('earlyBirdPriceChf', { valueAsNumber: true })}
                  className={inputClass}
                />
                {errors.earlyBirdPriceChf && <p className={errorClass}>{errors.earlyBirdPriceChf.message}</p>}
              </div>
              <div>
                <label className={labelClass}>Frühbucher bis *</label>
                <input type="date" {...register('earlyBirdDeadline')} className={inputClass} />
                {errors.earlyBirdDeadline && <p className={errorClass}>{errors.earlyBirdDeadline.message}</p>}
              </div>
            </>
          )}
        </div>
        <div className="rounded-xl border-l-4 border-accent bg-accent/10 p-4 text-sm text-foreground">
          <strong>Historie geschützt:</strong> Bestehende Anmeldungen behalten ihren gebuchten Preis.
          Änderungen aktualisieren keine früheren Buchungen.
        </div>
      </div>

      {/* 4 · Veröffentlichung (Panel-Nummer folgt der Referenz; Termine/SessionEditor sitzt als
          eigene Komponente dazwischen, siehe Workspace) */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-foreground">4 · Veröffentlichung</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Entwurf prüfen und kontrolliert auf allen verbundenen Seiten publizieren.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Anmeldung öffnet</label>
            <input type="datetime-local" {...register('registrationOpensAt')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Anmeldung schliesst</label>
            <input type="datetime-local" {...register('registrationClosesAt')} className={inputClass} />
          </div>
        </div>
        <div className="flex flex-wrap gap-3 pt-2">
          <Button type="submit" variant="outline" disabled={submitState === 'saving' || submitState === 'publishing'}>
            {submitState === 'saving' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Entwurf speichern
          </Button>
          <Button type="button" onClick={onPublish} disabled={submitState === 'saving' || submitState === 'publishing'}>
            {submitState === 'publishing' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Veröffentlichen
          </Button>
          {edition && edition.status !== 'archived' && (
            <Button type="button" variant="ghost" className="text-destructive" onClick={onArchive}>
              Archivieren
            </Button>
          )}
        </div>
      </div>
    </form>
  )
}
