'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, ArrowRight, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { forgotPasswordSchema } from '@/types/auth'
import { authClient } from '@/lib/auth-client'

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSent(false)

    const parsed = forgotPasswordSchema.safeParse({ email })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Ungültige E-Mail-Adresse')
      setLoading(false)
      return
    }

    const { error: resetError } = await authClient.requestPasswordReset({
      email: parsed.data.email,
      redirectTo: '/reset-password',
    })

    setLoading(false)

    if (resetError) {
      setError(resetError.message || 'Anfrage konnte nicht verarbeitet werden. Bitte versuche es erneut.')
    } else {
      setSent(true)
    }
  }

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Passwort vergessen?
        </h1>
        <p className="mt-2 text-muted-foreground">
          Gib deine E-Mail-Adresse ein. Wir senden dir einen Link zum Zurücksetzen deines Passworts.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        {sent ? (
          <div className="space-y-6 text-center">
            <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">E-Mail gesendet!</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Falls ein Konto mit <strong>{email}</strong> existiert, haben wir dir einen Link zum Zurücksetzen deines Passworts gesendet. Bitte prüfe deinen Posteingang.
              </p>
            </div>
            <Link href="/login" className="inline-block w-full">
              <Button variant="outline" className="w-full rounded-xl py-3">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Zurück zum Login
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-foreground">
                E-Mail-Adresse
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
                  Link anfordern
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </form>
        )}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Erinnerst du dich wieder?{' '}
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
