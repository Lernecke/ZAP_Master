'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, ArrowRight, Loader2, Info, Sparkles, CheckCircle2 } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { getSafeCallbackUrl } from '@/lib/auth/callback-url'
import { loginSchema } from '@/types/auth'
import { authClient, signIn } from '@/lib/auth-client'
import { z } from 'zod'

const magicLinkSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
})

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isRelogin = searchParams.get('relogin') === 'true'
  const isResetSuccess = searchParams.get('reset') === 'success'
  const callbackUrl = getSafeCallbackUrl(searchParams.get('callbackUrl'))

  const [mode, setMode] = useState<'password' | 'magic-link'>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const parsed = loginSchema.safeParse({ email, password })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Ungültige Eingabe')
      setLoading(false)
      return
    }

    const { error: signInError } = await signIn.email({
      email: parsed.data.email,
      password: parsed.data.password,
      callbackURL: callbackUrl || '/dashboard',
    })

    if (signInError) {
      setError(signInError.message || 'Login fehlgeschlagen. Prüfe deine Anmeldedaten.')
      setLoading(false)
    } else {
      router.push(callbackUrl)
      router.refresh()
    }
  }

  const handleMagicLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMagicLinkSent(false)

    const parsed = magicLinkSchema.safeParse({ email })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Ungültige E-Mail-Adresse')
      setLoading(false)
      return
    }

    const { error: magicError } = await authClient.signIn.magicLink({
      email: parsed.data.email,
      callbackURL: callbackUrl || '/dashboard',
    })

    setLoading(false)
    if (magicError) {
      setError(magicError.message || 'Magic Link konnte nicht gesendet werden. Bitte versuche es erneut.')
    } else {
      setMagicLinkSent(true)
    }
  }

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Willkommen zurück
        </h1>
        <p className="mt-2 text-muted-foreground">
          Melde dich an, um dein Training fortzusetzen
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        {isResetSuccess && (
          <div className="mb-6 flex items-start gap-3 rounded-xl bg-green-500/10 border border-green-500/20 p-4">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                Passwort geändert
              </p>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                Dein Passwort wurde erfolgreich aktualisiert. Du kannst dich jetzt anmelden.
              </p>
            </div>
          </div>
        )}

        {isRelogin && (
          <div className="mb-6 flex items-start gap-3 rounded-xl bg-blue-500/10 border border-blue-500/20 p-4">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Sicherheitsupdate
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Bitte melde dich erneut an, um die verbesserte Sicherheit zu aktivieren.
              </p>
            </div>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
          <button
            type="button"
            onClick={() => {
              setMode('password')
              setError('')
              setMagicLinkSent(false)
            }}
            className={`rounded-lg py-2 text-sm font-medium transition-all ${
              mode === 'password'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Passwort
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('magic-link')
              setError('')
            }}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-all ${
              mode === 'magic-link'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sparkles className="h-4 w-4 text-primary" />
            Magic Link
          </button>
        </div>

        {mode === 'password' ? (
          <form onSubmit={handlePasswordSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-foreground">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background py-3 pl-11 pr-4 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="deine@email.ch"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-foreground">
                  Passwort
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  Passwort vergessen?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background py-3 pl-11 pr-4 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                {error}
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
                  Wird angemeldet...
                </>
              ) : (
                <>
                  Anmelden
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleMagicLinkSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="magic-email" className="block text-sm font-medium text-foreground">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="magic-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background py-3 pl-11 pr-4 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="deine@email.ch"
                  required
                />
              </div>
            </div>

            {magicLinkSent && (
              <div className="flex items-start gap-3 rounded-xl bg-green-500/10 border border-green-500/20 p-4 text-sm text-green-700 dark:text-green-300">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Magic Link gesendet!</p>
                  <p className="mt-1 text-xs opacity-90">
                    Wir haben einen Anmeldelink an <strong>{email}</strong> gesendet. Bitte prüfe deinen Posteingang und klicke auf den Link.
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                {error}
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
                  Wird gesendet...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Magic Link senden
                </>
              )}
            </Button>
          </form>
        )}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Noch kein Konto?{' '}
        <Link
          href="/register"
          className="font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Jetzt registrieren
        </Link>
      </p>
    </div>
  )
}

