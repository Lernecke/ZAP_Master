'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Lock, ArrowRight, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { resetPasswordSchema } from '@/types/auth'
import { authClient } from '@/lib/auth-client'

export function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const parsed = resetPasswordSchema.safeParse({ password, confirmPassword })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Ungültige Eingabe')
      setLoading(false)
      return
    }

    if (!token) {
      setError('Kein gültiger Token vorhanden. Bitte fordere einen neuen Link an.')
      setLoading(false)
      return
    }

    const { error: resetError } = await authClient.resetPassword({
      newPassword: parsed.data.password,
      token,
    })

    setLoading(false)

    if (resetError) {
      setError(resetError.message || 'Passwort konnte nicht zurückgesetzt werden. Der Link ist möglicherweise abgelaufen.')
    } else {
      setSuccess(true)
      setTimeout(() => {
        router.push('/login?reset=success')
      }, 2000)
    }
  }

  if (!token) {
    return (
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Ungültiger Link
          </h1>
          <p className="mt-2 text-muted-foreground">
            Der Link zum Zurücksetzen des Passworts ist ungültig oder unvollständig.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm space-y-6">
          <div className="flex items-start gap-3 rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Token fehlt</p>
              <p className="mt-1 text-xs opacity-90">
                Bitte verwende den vollständigen Link aus der E-Mail oder fordere einen neuen Zurücksetzungs-Link an.
              </p>
            </div>
          </div>

          <Link href="/forgot-password" className="inline-block w-full">
            <Button className="w-full rounded-xl py-3 font-semibold">
              Neuen Link anfordern
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="w-full max-w-md space-y-8">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Passwort zurückgesetzt!
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Dein Passwort wurde erfolgreich aktualisiert. Du wirst zum Login weitergeleitet...
            </p>
          </div>
          <Link href="/login?reset=success">
            <Button className="w-full rounded-xl py-3 font-semibold">
              Jetzt anmelden
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
          Neues Passwort festlegen
        </h1>
        <p className="mt-2 text-muted-foreground">
          Gib dein neues Passwort ein und bestätige es.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-foreground">
              Neues Passwort
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-input bg-background py-3 pl-11 pr-4 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="Mindestens 6 Zeichen"
                required
              />
            </div>
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
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-input bg-background py-3 pl-11 pr-4 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="Passwort wiederholen"
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
                Wird gespeichert...
              </>
            ) : (
              <>
                Passwort speichern
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </form>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        <Link
          href="/login"
          className="font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Zurück zum Login
        </Link>
      </p>
    </div>
  )
}
