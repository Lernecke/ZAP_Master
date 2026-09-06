import Stripe from 'stripe'
import type { CreateCheckoutSessionParams, CreateCheckoutSessionResult } from '@/types/payment'

let stripeInstance: Stripe | null = null

export function getStripeServerClient(): Stripe {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not set in environment variables')
    }
    stripeInstance = new Stripe(secretKey)
  }
  return stripeInstance
}

/**
 * Creates a Stripe Checkout Session for Swiss Franc (CHF) payments supporting TWINT and Credit/Debit Cards.
 */
export async function createStripeCheckoutSession(
  params: CreateCheckoutSessionParams
): Promise<CreateCheckoutSessionResult> {
  const stripe = getStripeServerClient()
  const currency = (params.currency || 'chf').toLowerCase()

  // Default to card and twint payment methods
  const paymentMethodTypes = params.payment_methods || ['card', 'twint']

  const session = await stripe.checkout.sessions.create({
    payment_method_types: paymentMethodTypes,
    line_items: [
      {
        price_data: {
          currency: currency,
          product_data: {
            name: params.description || 'ZAP Kurs / Angebot',
          },
          unit_amount: params.amount_rappen,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    customer_email: params.customer_email,
    success_url: params.success_url,
    cancel_url: params.cancel_url,
    metadata: {
      anmeldung_id: params.anmeldung_id || '',
      user_id: params.user_id || '',
      ...(params.metadata || {}),
    },
  })

  return {
    sessionId: session.id,
    url: session.url,
    paymentId: session.id,
  }
}
