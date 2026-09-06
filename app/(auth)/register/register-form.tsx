'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Mail, Lock, ArrowRight, Loader2, CheckCircle2, User } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { registerSchema, type RegisterInput } from '@/types/auth'
import { signUp, signIn } from '@/lib/auth-client'

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  )
}

export function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [serverError, setServerError] = useState('')

  const urlErrorParam = searchParams.get('error')
  const urlErrorMessage = urlErrorParam
    ? urlErrorParam === 'account_already_linked_to_different_user'
      ? 'Dieses Google-Konto ist bereits mit einem anderen Konto verknüpft. Bitte melde dich an.'
      : urlErrorParam === "email_doesn't_match"
      ? 'Die E-Mail-Adresse des Google-Kontos stimmt nicht überein.'
      : 'Registrierung mit Google fehlgeschlagen. Bitte versuche es erneut.'
    : null

  const handleGoogleRegister = async () => {
    setLoading(true)
    setServerError('')
    try {
      const { error: googleError } = await signIn.social({
        provider: 'google',
        callbackURL: '/dashboard',
        errorCallbackURL: '/register?error=google_error',
      })
      if (googleError) {
        setServerError(googleError.message || 'Registrierung mit Google konnte nicht gestartet werden.')
        setLoading(false)
      }
    } catch {
      setServerError('Fehler bei der Google-Registrierung.')
      setLoading(false)
    }
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterInput) => {
    setLoading(true)
    setServerError('')

    const { error: signUpError } = await signUp.email({
      email: data.email,
      password: data.password,
      name: `${data.firstName} ${data.lastName}`.trim(),
      callbackURL: '/dashboard',
    })

    if (signUpError) {
      setServerError(signUpError.message || 'Registrierung fehlgeschlagen.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  if (success) {
    return (
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Registrierung erfolgreich!
          </h2>
          <p className="text-muted-foreground mb-6">
            Du kannst dich jetzt anmelden.
          </p>
          <Link href="/login">
            <Button className="rounded-xl">
              Zum Login
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Konto erstellen
        </h1>
        <p className="mt-2 text-muted-foreground">
          Starte jetzt mit deinem ZAP-Training
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        {urlErrorMessage && (
          <div className="mb-6 rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
            {urlErrorMessage}
          </div>
        )}

        {/* Google Registration */}
        <div className="mb-6 space-y-4">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={handleGoogleRegister}
            className="w-full flex items-center justify-center gap-3 rounded-xl py-3 border-border hover:bg-accent/50 font-medium transition-all"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <GoogleIcon className="h-5 w-5" />
                Mit Google registrieren
              </>
            )}
          </Button>

          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <span className="relative bg-card px-3 text-xs uppercase text-muted-foreground font-medium">
              oder mit E-Mail
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="firstName" className="block text-sm font-medium text-foreground">
                Vorname
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="firstName"
                  type="text"
                  {...register('firstName')}
                  className="w-full rounded-xl border border-input bg-background py-3 pl-11 pr-4 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="Max"
                />
              </div>
              {errors.firstName && (
                <p className="text-sm text-destructive">{errors.firstName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="lastName" className="block text-sm font-medium text-foreground">
                Nachname
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="lastName"
                  type="text"
                  {...register('lastName')}
                  className="w-full rounded-xl border border-input bg-background py-3 pl-11 pr-4 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="Mustermann"
                />
              </div>
              {errors.lastName && (
                <p className="text-sm text-destructive">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-foreground">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                id="email"
                type="email"
                {...register('email')}
                className="w-full rounded-xl border border-input bg-background py-3 pl-11 pr-4 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="deine@email.ch"
              />
            </div>
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-foreground">
              Passwort
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                id="password"
                type="password"
                {...register('password')}
                className="w-full rounded-xl border border-input bg-background py-3 pl-11 pr-4 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="Mindestens 6 Zeichen"
              />
            </div>
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground">
              Passwort bestätigen
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                id="confirmPassword"
                type="password"
                {...register('confirmPassword')}
                className="w-full rounded-xl border border-input bg-background py-3 pl-11 pr-4 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="Passwort wiederholen"
              />
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>

          {serverError && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {serverError}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl py-3 text-base font-semibold"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Wird registriert...
              </>
            ) : (
              <>
                Registrieren
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </form>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Bereits ein Konto?{' '}
        <Link
          href="/login"
          className="font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Anmelden
        </Link>
      </p>
    </div>
  )
}
