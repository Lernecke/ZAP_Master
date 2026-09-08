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

    const adminSupabase = createAdminSupabaseClient()

    // 1. Check if payment was already succeeded or if an existing non-succeeded record exists to update
    let existingPayment: { id: string; status: string } | null = null

    if (body.anmeldung_id) {
      const { data: anmeldungPayments } = await adminSupabase
        .from('payments')
        .select('id, status, created_at')
        .eq('anmeldung_id', body.anmeldung_id)
        .order('created_at', { ascending: false })

      if (anmeldungPayments && anmeldungPayments.length > 0) {
        const succeeded = anmeldungPayments.find((p) => p.status === 'succeeded')
        if (succeeded) {
          return NextResponse.json(
            { error: 'Diese Kursanmeldung wurde bereits erfolgreich bezahlt.' },
            { status: 400 }
          )
        }
        const pendingOrFailed = anmeldungPayments.find((p) => p.status !== 'succeeded')
        if (pendingOrFailed) {
          existingPayment = pendingOrFailed
        }
      }
    }

    if (!existingPayment && body.retry_payment_id) {
      const { data: targetPayment } = await adminSupabase
        .from('payments')
        .select('id, status')
        .eq('id', body.retry_payment_id)
        .maybeSingle()

      if (targetPayment) {
        if (targetPayment.status === 'succeeded') {
          return NextResponse.json(
            { error: 'Diese Zahlung wurde bereits erfolgreich abgeschlossen.' },
            { status: 400 }
          )
        }
        existingPayment = targetPayment
      }
    }

    // 2. Create Checkout Session with Stripe (Card & TWINT support in CHF)
    const stripeSession = await createStripeCheckoutSession({
      anmeldung_id: body.anmeldung_id,
      retry_payment_id: body.retry_payment_id,
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

    // 3. Persist / update payment record in Supabase
    let paymentId: string

    if (existingPayment) {
      const { data: updatedRecord, error: updateErr } = await adminSupabase
        .from('payments')
        .update({
          stripe_checkout_session_id: stripeSession.sessionId,
          amount_rappen: body.amount_rappen,
          currency: (body.currency || 'chf').toLowerCase(),
          status: 'pending',
          payment_method_types: body.payment_methods || ['card', 'twint'],
          metadata: body.metadata || {},
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingPayment.id)
        .select('id')
        .single()

      if (updateErr) {
        console.error('Error updating payment record on retry:', updateErr)
        return NextResponse.json(
          { error: 'Fehler beim Aktualisieren des Zahlungsdatensatzes in der Datenbank' },
          { status: 500 }
        )
      }

      paymentId = updatedRecord.id

      // If anmeldung_id is set, mark any other non-succeeded payment attempts as canceled
      if (body.anmeldung_id) {
        await adminSupabase
          .from('payments')
          .update({ status: 'canceled', updated_at: new Date().toISOString() })
          .eq('anmeldung_id', body.anmeldung_id)
          .neq('id', existingPayment.id)
          .neq('status', 'succeeded')
      }
    } else {
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

      paymentId = paymentRecord.id
    }

    return NextResponse.json({
      url: stripeSession.url,
      sessionId: stripeSession.sessionId,
      paymentId,
    })
  } catch (error) {
    console.error('Stripe create checkout session error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unerwarteter Fehler bei der Zahlungsinitialisierung'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
