import { NextResponse } from 'next/server'
import { getStripeServerClient } from '@/lib/stripe'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('session_id')

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session_id parameter' }, { status: 400 })
    }

    const stripe = getStripeServerClient()
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (!session) {
      return NextResponse.json({ error: 'Checkout Session not found' }, { status: 404 })
    }

    const isPaid = session.payment_status === 'paid'
    const status = isPaid ? 'succeeded' : session.payment_status
    const paymentIntentId = typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id || null

    // Sync status to Supabase DB immediately
    const adminSupabase = createAdminSupabaseClient()
    const { error: dbError } = await adminSupabase.rpc('process_stripe_payment_update', {
      p_checkout_session_id: session.id,
      p_payment_intent_id: paymentIntentId,
      p_status: status,
      p_metadata: {
        customer_email: session.customer_details?.email || null,
        payment_status: session.payment_status,
        verified_at: new Date().toISOString(),
      },
    })

    if (dbError) {
      console.error('Error syncing payment status in verify-session:', dbError)
    }

    return NextResponse.json({
      status,
      payment_status: session.payment_status,
      amount_total: session.amount_total,
      currency: session.currency,
      customer_email: session.customer_details?.email || null,
      metadata: session.metadata,
    })
  } catch (error) {
    console.error('Error verifying Stripe session:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
