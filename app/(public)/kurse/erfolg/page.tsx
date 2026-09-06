'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, ArrowRight, Loader2, AlertCircle, ShoppingBag } from 'lucide-react'
import { Button } from '@/app/components/ui/button'

interface VerificationState {
  loading: boolean
  success: boolean
  amount?: number
  currency?: string
  email?: string
  error?: string
}

function SuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')

  const [state, setState] = useState<VerificationState>({
    loading: true,
    success: false,
  })

  useEffect(() => {
    let isMounted = true

    async function verify() {
      if (!sessionId) {
        if (isMounted) {
          setState({
            loading: false,
            success: false,
            error: 'Keine Session-ID angegeben.',
          })
        }
        return
      }

      try {
        const res = await fetch(`/api/stripe/verify-session?session_id=${encodeURIComponent(sessionId)}`)
        const data = await res.json()

        if (!isMounted) return

        if (!res.ok || data.error) {
          setState({
            loading: false,
            success: false,
            error: data.error || 'Zahlungsverifikation fehlgeschlagen.',
          })
          return
        }

        setState({
          loading: false,
          success: data.status === 'succeeded',
          amount: data.amount_total ? data.amount_total / 100 : undefined,
          currency: (data.currency || 'chf').toUpperCase(),
          email: data.customer_email || undefined,
        })
      } catch (err) {
        if (isMounted) {
          setState({
            loading: false,
            success: false,
            error: err instanceof Error ? err.message : 'Netzwerkfehler',
          })
        }
      }
    }

    verify()

    return () => {
      isMounted = false
    }
  }, [sessionId])

  if (state.loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <h2 className="text-xl font-semibold text-foreground">Zahlungsstatus wird überprüft...</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Bitte warte einen Moment, während deine Stripe-Zahlung bestätigt wird.
        </p>
      </div>
    )
  }

  if (state.error || !state.success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 max-w-md mx-auto">
        <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Zahlung konnte nicht verifiziert werden</h2>
        <p className="text-sm text-muted-foreground mb-6">
          {state.error || 'Die Zahlung wurde nicht abgeschlossen oder abgebrochen.'}
        </p>
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/kurse">
            Zurück zu den Kursen
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[450px] text-center p-6 max-w-lg mx-auto">
      <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-6 animate-in zoom-in-50 duration-300">
        <CheckCircle2 className="w-10 h-10" />
      </div>

      <h1 className="text-3xl font-extrabold text-foreground mb-2">
        Vielen Dank für deine Zahlung!
      </h1>
      <p className="text-muted-foreground text-base mb-6">
        Deine Zahlung wurde erfolgreich verarbeitet und dein Status wurde aktualisiert.
      </p>

      {state.amount && (
        <div className="w-full bg-card border border-border rounded-xl p-4 mb-6 space-y-2 text-left">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Betrag:</span>
            <span className="font-semibold text-foreground">{state.currency} {state.amount.toFixed(2)}</span>
          </div>
          {state.email && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Bestätigung an:</span>
              <span className="font-medium text-foreground">{state.email}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Status:</span>
            <span className="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              Bezahlt (Stripe)
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 w-full">
        <Button asChild className="flex-1 rounded-xl h-11" size="lg">
          <Link href="/dashboard">
            Zum Dashboard <ArrowRight className="ml-2 w-4 h-4" />
          </Link>
        </Button>
        <Button asChild variant="outline" className="flex-1 rounded-xl h-11" size="lg">
          <Link href="/profil">
            <ShoppingBag className="mr-2 w-4 h-4" /> Zum Profil
          </Link>
        </Button>
      </div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <div className="container max-w-4xl py-12 px-4">
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
      }>
        <SuccessContent />
      </Suspense>
    </div>
  )
}
