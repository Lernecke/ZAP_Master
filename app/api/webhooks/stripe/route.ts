import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getStripeServerClient } from '@/lib/stripe'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const bodyText = await req.text()
  const headerList = await headers()
  const signature = headerList.get('stripe-signature')

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured in environment variables')
    return NextResponse.json(
      { error: 'Webhook secret is not configured' },
      { status: 500 }
    )
  }

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  let event: Stripe.Event
  try {
    const stripe = getStripeServerClient()
    event = stripe.webhooks.constructEvent(bodyText, signature, webhookSecret)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown webhook signature validation error'
    console.error(`Stripe Webhook Signature Verification Failed: ${errorMessage}`)
    return NextResponse.json({ error: `Webhook Error: ${errorMessage}` }, { status: 400 })
  }

  const adminSupabase = createAdminSupabaseClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const sessionId = session.id
        const paymentIntentId = typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id || null
        const isPaid = session.payment_status === 'paid'
        const status = isPaid ? 'succeeded' : 'processing'

        const { error } = await adminSupabase.rpc('process_stripe_payment_update', {
          p_checkout_session_id: sessionId,
          p_payment_intent_id: paymentIntentId,
          p_status: status,
          p_metadata: {
            customer_email: session.customer_details?.email || null,
            payment_status: session.payment_status,
          },
        })

        if (error) {
          console.error('Failed to update payment status for checkout.session.completed:', error)
          return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
        }
        break
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const paymentIntentId = paymentIntent.id

        const { error } = await adminSupabase.rpc('process_stripe_payment_update', {
          p_checkout_session_id: null,
          p_payment_intent_id: paymentIntentId,
          p_status: 'succeeded',
          p_metadata: {
            payment_method_types: paymentIntent.payment_method_types,
          },
        })

        if (error) {
          console.error('Failed to update payment status for payment_intent.succeeded:', error)
        }
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const paymentIntentId = paymentIntent.id

        const { error } = await adminSupabase.rpc('process_stripe_payment_update', {
          p_checkout_session_id: null,
          p_payment_intent_id: paymentIntentId,
          p_status: 'failed',
          p_metadata: {
            last_payment_error: paymentIntent.last_payment_error?.message || null,
          },
        })

        if (error) {
          console.error('Failed to update payment status for payment_intent.payment_failed:', error)
        }
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        const paymentIntentId = typeof charge.payment_intent === 'string'
          ? charge.payment_intent
          : charge.payment_intent?.id || null

        if (paymentIntentId) {
          const { error } = await adminSupabase.rpc('process_stripe_payment_update', {
            p_checkout_session_id: null,
            p_payment_intent_id: paymentIntentId,
            p_status: 'refunded',
            p_metadata: {
              amount_refunded: charge.amount_refunded,
            },
          })

          if (error) {
            console.error('Failed to update payment status for charge.refunded:', error)
          }
        }
        break
      }

      default:
        // Unhandled event types are acknowledged safely
        break
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error(`Stripe Webhook processing error for event ${event.type}:`, error)
    return NextResponse.json(
      { error: 'Internal server error while processing webhook' },
      { status: 500 }
    )
  }
}
