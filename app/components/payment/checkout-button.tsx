'use client'

import * as React from 'react'
import { useState } from 'react'
import { CreditCard, Smartphone, Loader2, CheckCircle2, Building2, Download } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

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
  const router = useRouter()
  const [selectedMethod, setSelectedMethod] = useState<'all' | 'card' | 'twint' | 'bank_transfer'>('all')
  const [isLoading, setIsLoading] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [createdPaymentId, setCreatedPaymentId] = useState<string | null>(null)

  const formattedAmount = (amountRappen / 100).toFixed(2)

  const handleDownloadPDF = async () => {
    if (!createdPaymentId) return
    setIsDownloading(true)
    try {
      const res = await fetch(`/api/payments/bank-transfer/pdf?paymentId=${createdPaymentId}`)
      if (!res.ok) {
        const errText = await res.text()
        throw new Error(errText || 'Fehler beim Abrufen der Rechnung')
      }
      
      const blob = await res.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      window.open(blobUrl, '_blank')
    } catch (err) {
      console.error('Download error:', err)
      toast.error(err instanceof Error ? err.message : 'Fehler beim Herunterladen der PDF')
    } finally {
      setIsDownloading(false)
    }
  }

  const handleCheckout = async (paymentMethod?: 'card' | 'twint' | 'bank_transfer') => {
    setIsLoading(true)
    try {
      const currentUrl = typeof window !== 'undefined' ? window.location.href : ''
      const successUrl = customSuccessUrl || `${typeof window !== 'undefined' ? window.location.origin : ''}/kurse/erfolg?session_id={CHECKOUT_SESSION_ID}`
      const cancelUrl = customCancelUrl || currentUrl || `${typeof window !== 'undefined' ? window.location.origin : ''}/kurse`

      const methodToUse = paymentMethod || selectedMethod
      
      if (methodToUse === 'bank_transfer') {
        const response = await fetch('/api/payments/bank-transfer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            anmeldung_id: anmeldungId,
            user_id: userId,
            amount_rappen: amountRappen,
            description,
            customer_email: customerEmail,
            currency: 'chf'
          }),
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Fehler beim Erstellen der QR-Rechnung')
        }

        if (data.paymentId) {
          setCreatedPaymentId(data.paymentId)
        } else {
          throw new Error('Keine Zahlungs-ID vom Server erhalten')
        }
      } else {
        const paymentMethods = methodToUse === 'all'
          ? ['card', 'twint']
          : [methodToUse]

        const response = await fetch('/api/stripe/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
      }
    } catch (err) {
      console.error('Checkout error:', err)
      toast.error(err instanceof Error ? err.message : 'Zahlungsfehler aufgetreten')
    } finally {
      setIsLoading(false)
    }
  }

  if (createdPaymentId) {
    return (
      <div className={`space-y-6 rounded-xl border border-border bg-card p-5 shadow-sm ${className || ''}`}>
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="font-semibold text-foreground text-lg">Rechnung erstellt</h3>
          <p className="text-sm text-muted-foreground">
            Bitte öffnen Sie die PDF-Rechnung, um den Betrag von CHF {formattedAmount} zu begleichen.
          </p>
        </div>

        <Button
          onClick={handleDownloadPDF}
          disabled={isDownloading}
          variant="outline"
          className="w-full h-11 text-base font-medium border-primary/50 text-primary hover:bg-primary/5"
        >
          {isDownloading ? (
            <Loader2 className="mr-2 size-5 animate-spin" />
          ) : (
            <Download className="mr-2 size-5" />
          )}
          Rechnung als PDF anzeigen
        </Button>

        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/50 p-4 border border-amber-200 dark:border-amber-900">
          <p className="text-sm text-amber-800 dark:text-amber-200 text-center font-medium">
            Bitte beachten Sie, dass es bis zu 3 Tage dauern kann, bis der Kurs nach Zahlungseingang freigeschaltet wird.
          </p>
        </div>

        <Button
          onClick={() => {
            const successUrl = customSuccessUrl || '/kurse/erfolg'
            router.push(successUrl.replace('?session_id={CHECKOUT_SESSION_ID}', `?payment_id=${createdPaymentId}`))
          }}
          className="w-full h-11 text-base font-medium"
          size="lg"
        >
          <CheckCircle2 className="mr-2 size-5" />
          Zahlung abgeschlossen / Weiter
        </Button>
      </div>
    )
  }

  return (
    <div className={`space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm ${className || ''}`}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Zahlungsmethode wählen</h3>
        <span className="text-lg font-bold text-primary">CHF {formattedAmount}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
          <span className="text-xs text-muted-foreground hidden md:inline-block">Schweizer Mobile Payment</span>
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
          <span className="text-sm font-medium">Kreditkarte</span>
          <span className="text-xs text-muted-foreground hidden md:inline-block">Visa, Mastercard, etc.</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedMethod('bank_transfer')}
          className={`flex flex-col items-center justify-center gap-2 rounded-lg border p-4 text-center transition-all ${
            selectedMethod === 'bank_transfer'
              ? 'border-primary bg-primary/5 ring-2 ring-primary/30'
              : 'border-border bg-background hover:bg-accent/50'
          }`}
        >
          <div className="flex size-10 items-center justify-center rounded-full bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300">
            <Building2 className="size-5" />
          </div>
          <span className="text-sm font-medium">Banküberweisung</span>
          <span className="text-xs text-muted-foreground hidden md:inline-block">QR-Rechnung (PDF)</span>
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
            {selectedMethod === 'bank_transfer' ? 'Rechnung wird erstellt...' : 'Weiterleitung zu Stripe...'}
          </>
        ) : (
          <>
            <CheckCircle2 className="mr-2 size-5" />
            {buttonText || `Jetzt CHF ${formattedAmount} bezahlen`}
          </>
        )}
      </Button>
      
      <p className="text-center text-xs text-muted-foreground">
        Sichere Bezahlung verarbeitet über Stripe SDK. TWINT &amp; Kartenzahlung unterstützt. QR-Rechnung direkt verfügbar.
      </p>
    </div>
  )
}
