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
    let existingPayment: { id: string; status: string; metadata?: Record<string, unknown> | null; user_id?: string | null } | null = null

    if (body.anmeldung_id) {
      const { data: anmeldungPayments } = await adminSupabase
        .from('payments')
        .select('id, status, created_at, metadata, user_id')
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
          existingPayment = {
            id: pendingOrFailed.id,
            status: pendingOrFailed.status,
            metadata: (pendingOrFailed.metadata as Record<string, unknown> | null) ?? null,
            user_id: pendingOrFailed.user_id,
          }
        }
      }
    }

    if (!existingPayment && body.retry_payment_id) {
      const { data: targetPayment } = await adminSupabase
        .from('payments')
        .select('id, status, metadata, user_id')
        .eq('id', body.retry_payment_id)
        .maybeSingle()

      if (targetPayment) {
        if (targetPayment.status === 'succeeded') {
          return NextResponse.json(
            { error: 'Diese Zahlung wurde bereits erfolgreich abgeschlossen.' },
            { status: 400 }
          )
        }
        existingPayment = {
          id: targetPayment.id,
          status: targetPayment.status,
          metadata: (targetPayment.metadata as Record<string, unknown> | null) ?? null,
          user_id: targetPayment.user_id,
        }
      }
    }

    // Context preservation: extract additional anmeldung context if available
    const anmeldungMetadata: Record<string, string> = {}
    if (body.anmeldung_id) {
      const { data: anm } = await adminSupabase
        .from('intensivwoche_anmeldungen')
        .select('beneficiary_user_id, child_firstname, child_lastname, kurs_id, intensivwoche_kurse(name)')
        .eq('id', body.anmeldung_id)
        .maybeSingle()
      if (anm) {
        if (anm.beneficiary_user_id) anmeldungMetadata.beneficiary_user_id = anm.beneficiary_user_id
        if (anm.child_firstname || anm.child_lastname) {
          anmeldungMetadata.beneficiary_name = [anm.child_firstname, anm.child_lastname].filter(Boolean).join(' ')
        }
        if (anm.kurs_id) anmeldungMetadata.kurs_id = String(anm.kurs_id)
        const courseName = (anm.intensivwoche_kurse as { name?: string } | null)?.name
        if (courseName) anmeldungMetadata.kurs_name = courseName
      }
    }

    const mergedMetadata: Record<string, string> = {
      ...(typeof existingPayment?.metadata === 'object' && existingPayment.metadata ? (existingPayment.metadata as Record<string, string>) : {}),
      ...anmeldungMetadata,
      ...(body.metadata || {}),
    }

    const payerUserId = body.user_id || existingPayment?.user_id || undefined

    // 2. Create Checkout Session with Stripe (Card & TWINT support in CHF)
    const stripeSession = await createStripeCheckoutSession({
      anmeldung_id: body.anmeldung_id,
      retry_payment_id: body.retry_payment_id,
      user_id: payerUserId,
      amount_rappen: body.amount_rappen,
      currency: body.currency || 'chf',
      description: body.description || mergedMetadata.kurs_name || 'ZAP Kursanmeldung',
      customer_email: body.customer_email,
      payment_methods: body.payment_methods || ['card', 'twint'],
      success_url: body.success_url,
      cancel_url: body.cancel_url,
      metadata: mergedMetadata,
    })

    // 3. Persist / update payment record in Supabase
    let paymentId: string

    if (existingPayment) {
      const { data: updatedRecord, error: updateErr } = await adminSupabase
        .from('payments')
        .update({
          stripe_checkout_session_id: stripeSession.sessionId,
          user_id: payerUserId || null,
          amount_rappen: body.amount_rappen,
          currency: (body.currency || 'chf').toLowerCase(),
          status: 'pending',
          payment_method_types: body.payment_methods || ['card', 'twint'],
          metadata: mergedMetadata,
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
          user_id: payerUserId || null,
          stripe_checkout_session_id: stripeSession.sessionId,
          amount_rappen: body.amount_rappen,
          currency: (body.currency || 'chf').toLowerCase(),
          status: 'pending',
          payment_method_types: body.payment_methods || ['card', 'twint'],
          metadata: mergedMetadata,
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
