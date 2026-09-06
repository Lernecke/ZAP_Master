'use client'

import * as React from 'react'
import { useState } from 'react'
import { CreditCard, Smartphone, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { toast } from 'sonner'

export interface CheckoutButtonProps {
  anmeldungId?: string
  userId?: string
  amountRappen: number
  description?: string
  customerEmail?: string
  className?: string
  buttonText?: string
  successUrl?: string
  cancelUrl?: string
}

export function CheckoutButton({
  anmeldungId,
  userId,
  amountRappen,
  description = 'ZAP Kursanmeldung',
  customerEmail,
  className,
  buttonText,
  successUrl: customSuccessUrl,
  cancelUrl: customCancelUrl,
}: CheckoutButtonProps) {
  const [selectedMethod, setSelectedMethod] = useState<'all' | 'card' | 'twint'>('all')
  const [isLoading, setIsLoading] = useState(false)

  const formattedAmount = (amountRappen / 100).toFixed(2)

  const handleCheckout = async (paymentMethod?: 'card' | 'twint') => {
    setIsLoading(true)
    try {
      const currentUrl = typeof window !== 'undefined' ? window.location.href : ''
      const successUrl = customSuccessUrl || `${window.location.origin}/kurse/erfolg?session_id={CHECKOUT_SESSION_ID}`
      const cancelUrl = customCancelUrl || currentUrl || `${window.location.origin}/kurse`

      const paymentMethods = paymentMethod
        ? [paymentMethod]
        : selectedMethod === 'all'
        ? ['card', 'twint']
        : [selectedMethod]

      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          anmeldung_id: anmeldungId,
          user_id: userId,
          amount_rappen: amountRappen,
          description,
          customer_email: customerEmail,
          payment_methods: paymentMethods,
          success_url: successUrl,
          cancel_url: cancelUrl,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Erstellen der Zahlungssession')
      }

      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('Keine Weiterleitungs-URL von Stripe erhalten')
      }
    } catch (err) {
      console.error('Checkout error:', err)
      toast.error(err instanceof Error ? err.message : 'Zahlungsfehler aufgetreten')
      setIsLoading(false)
    }
  }

  return (
    <div className={`space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm ${className || ''}`}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Zahlungsmethode wählen</h3>
        <span className="text-lg font-bold text-primary">CHF {formattedAmount}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setSelectedMethod('twint')}
          className={`flex flex-col items-center justify-center gap-2 rounded-lg border p-4 text-center transition-all ${
            selectedMethod === 'twint'
              ? 'border-primary bg-primary/5 ring-2 ring-primary/30'
              : 'border-border bg-background hover:bg-accent/50'
          }`}
        >
          <div className="flex size-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <Smartphone className="size-5" />
          </div>
          <span className="text-sm font-medium">TWINT</span>
          <span className="text-xs text-muted-foreground">Schweizer Mobile Payment</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedMethod('card')}
          className={`flex flex-col items-center justify-center gap-2 rounded-lg border p-4 text-center transition-all ${
            selectedMethod === 'card'
              ? 'border-primary bg-primary/5 ring-2 ring-primary/30'
              : 'border-border bg-background hover:bg-accent/50'
          }`}
        >
          <div className="flex size-10 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            <CreditCard className="size-5" />
          </div>
          <span className="text-sm font-medium">Kredit- / Debitkarte</span>
          <span className="text-xs text-muted-foreground">Visa, Mastercard, etc.</span>
        </button>
      </div>

      <Button
        onClick={() => handleCheckout()}
        disabled={isLoading}
        className="w-full h-11 text-base font-medium"
        size="lg"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 size-5 animate-spin" />
            Weiterleitung zu Stripe...
          </>
        ) : (
          <>
            <CheckCircle2 className="mr-2 size-5" />
            {buttonText || `Jetzt CHF ${formattedAmount} bezahlen`}
          </>
        )}
      </Button>
      
      <p className="text-center text-xs text-muted-foreground">
        Sichere Bezahlung verarbeitet über Stripe SDK. TWINT &amp; Kartenzahlung unterstützt.
      </p>
    </div>
  )
}
