import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { createStripeCheckoutSession } from '@/lib/stripe'
import type { CreateCheckoutSessionParams } from '@/types/payment'

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreateCheckoutSessionParams

    if (!body.amount_rappen || body.amount_rappen <= 0) {
      return NextResponse.json(
        { error: 'Gültiger Betrag in Rappen ist erforderlich (amount_rappen)' },
        { status: 400 }
      )
    }

    if (!body.success_url || !body.cancel_url) {
      return NextResponse.json(
        { error: 'success_url und cancel_url sind erforderlich' },
        { status: 400 }
      )
    }

    // 1. Create Checkout Session with Stripe (Card & TWINT support in CHF)
    const stripeSession = await createStripeCheckoutSession({
      anmeldung_id: body.anmeldung_id,
      user_id: body.user_id,
      amount_rappen: body.amount_rappen,
      currency: body.currency || 'chf',
      description: body.description || 'ZAP Kursanmeldung',
      customer_email: body.customer_email,
      payment_methods: body.payment_methods || ['card', 'twint'],
      success_url: body.success_url,
      cancel_url: body.cancel_url,
      metadata: body.metadata,
    })

    // 2. Persist initial pending payment record in Supabase
    const adminSupabase = createAdminSupabaseClient()
    const { data: paymentRecord, error: dbError } = await adminSupabase
      .from('payments')
      .insert({
        anmeldung_id: body.anmeldung_id || null,
        user_id: body.user_id || null,
        stripe_checkout_session_id: stripeSession.sessionId,
        amount_rappen: body.amount_rappen,
        currency: (body.currency || 'chf').toLowerCase(),
        status: 'pending',
        payment_method_types: body.payment_methods || ['card', 'twint'],
        metadata: body.metadata || {},
      })
      .select('id')
      .single()

    if (dbError) {
      console.error('Error inserting initial payment record:', dbError)
      return NextResponse.json(
        { error: 'Fehler beim Erstellen des Zahlungsdatensatzes in der Datenbank' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      url: stripeSession.url,
      sessionId: stripeSession.sessionId,
      paymentId: paymentRecord.id,
    })
  } catch (error) {
    console.error('Stripe create checkout session error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unerwarteter Fehler bei der Zahlungsinitialisierung'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
