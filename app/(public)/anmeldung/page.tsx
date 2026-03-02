'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { 
  Zap, 
  User, 
  Mail, 
  Phone, 
  GraduationCap, 
  MessageSquare,
  Loader2, 
  CheckCircle2,
  AlertCircle,
  ArrowRight
} from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { 
  intensivwocheAnmeldungSchema, 
  type IntensivwocheAnmeldungInput 
} from '@/types/intensivwoche'
import { submitIntensivwocheAnmeldung } from './actions'

// Mock-Daten für Kurse (später aus DB laden)
const AVAILABLE_COURSES = [
  { id: '1', name: 'Mathematik Intensiv – Frühjahr 2026' },
  { id: '2', name: 'Deutsch Intensiv – Frühjahr 2026' },
]

export default function AnmeldungPage() {
  const [submitState, setSubmitState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [serverMessage, setServerMessage] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<IntensivwocheAnmeldungInput>({
    resolver: zodResolver(intensivwocheAnmeldungSchema),
    defaultValues: {
      notes: '',
    },
  })

  const onSubmit = async (data: IntensivwocheAnmeldungInput) => {
    setSubmitState('loading')
    setServerMessage('')

    const result = await submitIntensivwocheAnmeldung(data)

    if (result.success) {
      setSubmitState('success')
      setServerMessage(result.message)
    } else {
      setSubmitState('error')
      setServerMessage(result.error)
      
      // Field-level errors setzen
      if (result.fieldErrors) {
        Object.entries(result.fieldErrors).forEach(([field, messages]) => {
          setError(field as keyof IntensivwocheAnmeldungInput, {
            message: messages[0],
          })
        })
      }
    }
  }

  // Erfolgs-Ansicht
  if (submitState === 'success') {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <div className="rounded-2xl border border-border bg-card p-8 shadow-sm text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Anmeldung erfolgreich!
              </h2>
              <p className="text-muted-foreground mb-6">
                {serverMessage}
              </p>
              <Link href="/">
                <Button className="rounded-xl">
                  Zur Startseite
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Intensivwoche Anmeldung
            </h1>
            <p className="text-muted-foreground">
              Melde dein Kind für einen unserer Vorbereitungskurse an.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
              
              {/* Kursauswahl */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Kurs auswählen *
                </label>
                <select
                  {...register('kurs_id')}
                  className="w-full h-11 px-4 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                >
                  <option value="">— Bitte wählen —</option>
                  {AVAILABLE_COURSES.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))}
                </select>
                {errors.kurs_id && (
                  <p className="mt-1.5 text-sm text-destructive">{errors.kurs_id.message}</p>
                )}
              </div>

              {/* Kind-Daten Sektion */}
              <div className="pt-2">
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
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  {/* Klassenstufe */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Klassenstufe *
                    </label>
                    <div className="relative">
                      <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        {...register('child_class_level')}
                        placeholder="6. Klasse"
                        className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                      />
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
                    <div className="flex gap-3">
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

              {/* Eltern-Kontakt Sektion */}
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
              <div className="pt-4 border-t border-border">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Bemerkungen (optional)
                </label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <textarea
                    {...register('notes')}
                    rows={3}
                    placeholder="Allergien, besondere Bedürfnisse, etc."
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors resize-none"
                  />
                </div>
                {errors.notes && (
                  <p className="mt-1.5 text-sm text-destructive">{errors.notes.message}</p>
                )}
              </div>
            </div>

            {/* Server Error */}
            {submitState === 'error' && serverMessage && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
                <p className="text-sm text-destructive">{serverMessage}</p>
              </div>
            )}

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full h-12 rounded-xl text-base font-semibold"
              disabled={submitState === 'loading'}
            >
              {submitState === 'loading' ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Wird gesendet...
                </>
              ) : (
                <>
                  Anmeldung absenden
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Mit der Anmeldung akzeptierst du unsere{' '}
              <Link href="/datenschutz" className="text-primary hover:underline">
                Datenschutzbestimmungen
              </Link>
              .
            </p>
          </form>
        </div>
      </main>
    </div>
  )
}

// Header-Komponente (konsistent mit Register-Page)
function Header() {
  return (
    <header className="flex items-center justify-between px-6 py-4">
      <Link href="/" className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
          <Zap className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
        </div>
        <span className="text-xl font-bold tracking-tight text-foreground">ZAP</span>
      </Link>
    </header>
  )
}
