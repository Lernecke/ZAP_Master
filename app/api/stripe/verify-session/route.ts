import { NextResponse } from 'next/server'
import { getStripeServerClient } from '@/lib/stripe'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('session_id')?.trim()

    // Security Gate 1: Validate session_id presence and structure
    if (!sessionId || (!sessionId.startsWith('cs_test_') && !sessionId.startsWith('cs_live_'))) {
      return NextResponse.json({ error: 'Ungültiges Session-ID Format' }, { status: 400 })
    }

    // Security Gate 2: Fetch authoritative payment status directly from Stripe API over TLS
    const stripe = getStripeServerClient()
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (!session) {
      return NextResponse.json({ error: 'Checkout Session bei Stripe nicht gefunden' }, { status: 404 })
    }

    const isPaid = session.payment_status === 'paid'

    // Security Gate 3: Match session against our database record to prevent URL hijacking / cross-session tampering
    const adminSupabase = createAdminSupabaseClient()
    const { data: existingPayment } = await adminSupabase
      .from('payments')
      .select('id, status, amount_rappen, currency')
      .eq('stripe_checkout_session_id', session.id)
      .maybeSingle()

    if (!existingPayment) {
      return NextResponse.json(
        { error: 'Zahlungssession gehört nicht zu dieser Anwendung' },
        { status: 403 }
      )
    }

    // Strict Gate: Only transition to succeeded if Stripe explicitly confirms payment_status === 'paid'
    if (!isPaid) {
      return NextResponse.json({
        status: session.payment_status,
        success: false,
        error: 'Die Zahlung wurde bei Stripe noch nicht abgeschlossen oder autorisiert.',
      }, { status: 400 })
    }

    // Execute atomic DB update only when Stripe API verifies payment_status === 'paid'
    const paymentIntentId = typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id || null

    const { error: dbError } = await adminSupabase.rpc('process_stripe_payment_update', {
      p_checkout_session_id: session.id,
      p_payment_intent_id: paymentIntentId,
      p_status: 'succeeded',
      p_metadata: {
        customer_email: session.customer_details?.email || null,
        payment_status: session.payment_status,
        verified_at: new Date().toISOString(),
        verification_source: 'stripe_api_direct',
      },
    })

    if (dbError) {
      console.error('Error syncing payment status in verify-session:', dbError)
    }

    return NextResponse.json({
      status: 'succeeded',
      payment_status: 'paid',
      amount_total: session.amount_total,
      currency: session.currency,
      customer_email: session.customer_details?.email || null,
      metadata: session.metadata,
    })
  } catch (error) {
    console.error('Error verifying Stripe session:', error)
    const message = error instanceof Error ? error.message : 'Unerwarteter Verifikationsfehler'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
