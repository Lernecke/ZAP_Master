'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, ArrowRight, Loader2, Info, Sparkles, CheckCircle2, Fingerprint } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { getSafeCallbackUrl } from '@/lib/auth/callback-url'
import { loginSchema } from '@/types/auth'
import { authClient, signIn } from '@/lib/auth-client'
import { z } from 'zod'

const magicLinkSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
})

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

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isRelogin = searchParams.get('relogin') === 'true'
  const isResetSuccess = searchParams.get('reset') === 'success'
  const callbackUrl = getSafeCallbackUrl(searchParams.get('callbackUrl'))

  const urlErrorParam = searchParams.get('error')
  const urlErrorMessage = urlErrorParam
    ? urlErrorParam === 'account_already_linked_to_different_user'
      ? 'Dieses Google-Konto ist bereits mit einem anderen Benutzerkonto verknüpft.'
      : urlErrorParam === "email_doesn't_match"
      ? 'Die E-Mail-Adresse des Google-Kontos stimmt nicht überein.'
      : 'Anmeldung mit Google ist fehlgeschlagen. Bitte versuche es erneut.'
    : null

  const [mode, setMode] = useState<'password' | 'magic-link' | 'passkey'>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)

  const handleGoogleSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      const { error: googleError } = await signIn.social({
        provider: 'google',
        callbackURL: callbackUrl || '/dashboard',
        errorCallbackURL: '/login?error=google_error',
      })
      if (googleError) {
        setError(googleError.message || 'Anmeldung mit Google konnte nicht gestartet werden.')
        setLoading(false)
      }
    } catch {
      setError('Fehler bei der Google-Anmeldung.')
      setLoading(false)
    }
  }

  function translatePasskeyError(msg?: string): string {
    if (!msg) return 'Passkey-Anmeldung fehlgeschlagen. Bitte versuche es erneut.'
    const lower = msg.toLowerCase()
    if (lower.includes('passkey not found') || lower.includes('passkey_not_found') || lower.includes('no passkey')) {
      return 'Passkey wurde nicht gefunden. Bitte richte zuerst einen Passkey in deinem Profil ein.'
    }
    if (lower.includes('canceled') || lower.includes('cancelled') || lower.includes('abort') || lower.includes('notallowederror')) {
      return 'Anmeldung mit Passkey wurde abgebrochen.'
    }
    if (lower.includes('not supported') || lower.includes('unsupported')) {
      return 'Passkeys werden von diesem Browser oder Gerät leider nicht unterstützt.'
    }
    return msg
  }

  const handlePasskeySubmit = async () => {
    setLoading(true)
    setError('')

    try {
      const res = await authClient.signIn.passkey()

      if (res?.error) {
        setError(translatePasskeyError(res.error.message))
        setLoading(false)
      } else {
        router.push(callbackUrl || '/dashboard')
        router.refresh()
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? translatePasskeyError(err.message) : 'Passkey-Anmeldung fehlgeschlagen.'
      setError(errorMessage)
      setLoading(false)
    }
  }

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

        {urlErrorMessage && (
          <div className="mb-6 rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
            {urlErrorMessage}
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

        {/* Google Login */}
        <div className="mb-6 space-y-4">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={handleGoogleSubmit}
            className="w-full flex items-center justify-center gap-3 rounded-xl py-3 border-border hover:bg-accent/50 font-medium transition-all"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <GoogleIcon className="h-5 w-5" />
                Mit Google anmelden
              </>
            )}
          </Button>

          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <span className="relative bg-card px-3 text-xs uppercase text-muted-foreground font-medium">
              oder
            </span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="mb-6 grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
          <button
            type="button"
            onClick={() => {
              setMode('password')
              setError('')
              setMagicLinkSent(false)
            }}
            className={`rounded-lg py-2 text-xs sm:text-sm font-medium transition-all ${
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
            className={`flex items-center justify-center gap-1 rounded-lg py-2 text-xs sm:text-sm font-medium transition-all ${
              mode === 'magic-link'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Magic Link
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('passkey')
              setError('')
            }}
            className={`flex items-center justify-center gap-1 rounded-lg py-2 text-xs sm:text-sm font-medium transition-all ${
              mode === 'passkey'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Fingerprint className="h-3.5 w-3.5 text-primary" />
            Passkey
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
        ) : mode === 'magic-link' ? (
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
        ) : (
          <div className="space-y-6 text-center py-2">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Fingerprint className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-lg">Passkey-Anmeldung</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Melde dich schnell und sicher mit Touch ID, Face ID, Windows Hello oder deinem Sicherheitsschlüssel an.
              </p>
            </div>

            {error && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive text-left">
                {error}
              </div>
            )}

            <Button
              type="button"
              onClick={handlePasskeySubmit}
              disabled={loading}
              className="w-full rounded-xl py-3 text-base font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Passkey wird geprüft...
                </>
              ) : (
                <>
                  <Fingerprint className="mr-2 h-5 w-5" />
                  Mit Passkey anmelden
                </>
              )}
            </Button>
          </div>
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

