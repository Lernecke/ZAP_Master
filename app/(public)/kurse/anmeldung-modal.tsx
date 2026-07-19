'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { 
  X, 
  User, 
  Mail, 
  Phone, 
  GraduationCap, 
  MessageSquare,
  Loader2, 
  CheckCircle2,
  Calendar,
  MapPin,
  Clock,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { FACH_LABELS, FACH_FARBEN } from '@/types/kurs'
import { 
  intensivwocheAnmeldungSchema, 
  type IntensivwocheAnmeldungInput 
} from '@/types/intensivwoche'
import { submitIntensivwocheAnmeldung } from './actions'

// Generisches Kurs-Interface für Modal
interface KursForModal {
  id: number
  name: string
  fach: 'mathematik' | 'deutsch' | 'franzoesisch' | 'natur-mensch-gesellschaft'
  startDatum: string
  endDatum: string
  uhrzeit: string
  ort: string
  preis: number
  klassenstufen: string[]
}

interface AnmeldungModalProps {
  kurs: KursForModal
  onClose: () => void
}

export function AnmeldungModal({ kurs, onClose }: AnmeldungModalProps) {
  const [submitState, setSubmitState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [serverMessage, setServerMessage] = useState('')
  // Stabil über Re-Renders/Retries desselben Modal-Öffnens hinweg, neu bei erneutem Öffnen —
  // erlaubt der DB, einen wiederholten Submit (Doppelklick, Netzwerk-Retry) idempotent zu
  // behandeln statt eine doppelte Buchung anzulegen.
  const [idempotencyKey] = useState(() => crypto.randomUUID())

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<IntensivwocheAnmeldungInput>({
    resolver: zodResolver(intensivwocheAnmeldungSchema),
    defaultValues: {
      kurs_id: String(kurs.id),
      notes: '',
    },
  })

  // ESC-Taste zum Schliessen
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  // Body-Scroll verhindern
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  const onSubmit = async (data: IntensivwocheAnmeldungInput) => {
    setSubmitState('loading')
    setServerMessage('')

    const result = await submitIntensivwocheAnmeldung(data, idempotencyKey)

    if (result.success) {
      setSubmitState('success')
      setServerMessage(result.message)
    } else {
      setSubmitState('error')
      setServerMessage(result.error)
      
      if (result.fieldErrors) {
        Object.entries(result.fieldErrors).forEach(([field, messages]) => {
          setError(field as keyof IntensivwocheAnmeldungInput, {
            message: messages[0],
          })
        })
      }
    }
  }

  const farben = FACH_FARBEN[kurs.fach]

  const formatDatum = (datum: string) => {
    return new Date(datum).toLocaleDateString('de-CH', {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  // Erfolgs-Ansicht
  if (submitState === 'success') {
    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <div 
          className="w-full max-w-md bg-card rounded-2xl shadow-xl p-8 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mx-auto w-16 h-16 bg-secondary/15 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-8 h-8 text-secondary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Anmeldung erfolgreich!
          </h2>
          <p className="text-muted-foreground mb-2">
            {serverMessage}
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Du bist angemeldet für:<br />
            <span className="font-medium text-foreground">{kurs.name}</span>
          </p>
          <Button onClick={onClose} className="rounded-xl">
            Schliessen
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl bg-card rounded-2xl shadow-xl my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`${farben.bg} px-6 py-4 rounded-t-2xl flex items-start justify-between`}>
          <div>
            <span className={`text-xs font-medium ${farben.text} uppercase tracking-wider`}>
              {FACH_LABELS[kurs.fach]}
            </span>
            <h2 className="text-xl font-bold text-foreground mt-1">
              Anmeldung: {kurs.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5 text-foreground" />
          </button>
        </div>

        {/* Kurs-Info */}
        <div className="px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {formatDatum(kurs.startDatum)} – {formatDatum(kurs.endDatum)}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {kurs.uhrzeit}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {kurs.ort}
            </span>
          </div>
          <div className="mt-2 text-lg font-semibold text-foreground">
            CHF {kurs.preis}
          </div>
        </div>

        {/* Formular */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          {/* Hidden: kurs_id */}
          <input type="hidden" {...register('kurs_id')} />

          {/* Kind-Daten */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Angaben zum Kind
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Vorname */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Vorname *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    {...register('child_firstname')}
                    placeholder="Max"
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                  />
                </div>
                {errors.child_firstname && (
                  <p className="mt-1.5 text-sm text-destructive">{errors.child_firstname.message}</p>
                )}
              </div>

              {/* Nachname */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Nachname *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    {...register('child_lastname')}
                    placeholder="Muster"
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                  />
                </div>
                {errors.child_lastname && (
                  <p className="mt-1.5 text-sm text-destructive">{errors.child_lastname.message}</p>
                )}
              </div>

              {/* Klassenstufe */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Klassenstufe *
                </label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <select
                    {...register('child_class_level')}
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors appearance-none cursor-pointer"
                  >
                    <option value="">— Bitte wählen —</option>
                    {kurs.klassenstufen.map((stufe) => (
                      <option key={stufe} value={stufe}>
                        {stufe}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.child_class_level && (
                  <p className="mt-1.5 text-sm text-destructive">{errors.child_class_level.message}</p>
                )}
              </div>

              {/* Geschlecht */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Geschlecht *
                </label>
                <div className="flex gap-4 h-11 items-center">
                  {[
                    { value: 'm', label: 'Männlich' },
                    { value: 'w', label: 'Weiblich' },
                    { value: 'd', label: 'Divers' },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="radio"
                        value={option.value}
                        {...register('child_gender')}
                        className="w-4 h-4 text-primary border-border focus:ring-primary"
                      />
                      <span className="text-sm text-foreground">{option.label}</span>
                    </label>
                  ))}
                </div>
                {errors.child_gender && (
                  <p className="mt-1.5 text-sm text-destructive">{errors.child_gender.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Eltern-Kontakt */}
          <div className="pt-4 border-t border-border">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Kontaktdaten der Eltern
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* E-Mail */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  E-Mail *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    {...register('parent_email')}
                    placeholder="eltern@beispiel.ch"
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                  />
                </div>
                {errors.parent_email && (
                  <p className="mt-1.5 text-sm text-destructive">{errors.parent_email.message}</p>
                )}
              </div>

              {/* Telefon */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Telefon *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="tel"
                    {...register('parent_phone')}
                    placeholder="+41 79 123 45 67"
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                  />
                </div>
                {errors.parent_phone && (
                  <p className="mt-1.5 text-sm text-destructive">{errors.parent_phone.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Bemerkungen */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Bemerkungen (optional)
            </label>
            <div className="relative">
              <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <textarea
                {...register('notes')}
                rows={2}
                placeholder="Allergien, besondere Bedürfnisse, etc."
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors resize-none"
              />
            </div>
            {errors.notes && (
              <p className="mt-1.5 text-sm text-destructive">{errors.notes.message}</p>
            )}
          </div>

          {/* Server Error */}
          {submitState === 'error' && serverMessage && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{serverMessage}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-12 px-6 rounded-xl border border-border font-medium hover:bg-muted transition-colors"
            >
              Abbrechen
            </button>
            <Button 
              type="submit" 
              className="flex-1 h-12 rounded-xl font-semibold"
              disabled={submitState === 'loading'}
            >
              {submitState === 'loading' ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Wird gesendet...
                </>
              ) : (
                <>
                  <GraduationCap className="mr-2 h-5 w-5" />
                  Verbindlich anmelden
                </>
              )}
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Mit der Anmeldung akzeptierst du unsere Datenschutzbestimmungen und AGB.
          </p>
        </form>
      </div>
    </div>
  )
}
