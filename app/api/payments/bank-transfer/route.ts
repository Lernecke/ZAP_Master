import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
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

    const adminSupabase = createAdminSupabaseClient()

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
    const paymentMethodTypes = ['bank_transfer']

    let paymentId: string

    if (existingPayment) {
      const { data: updatedRecord, error: updateErr } = await adminSupabase
        .from('payments')
        .update({
          user_id: payerUserId || null,
          amount_rappen: body.amount_rappen,
          currency: (body.currency || 'chf').toLowerCase(),
          status: 'pending',
          payment_method_types: paymentMethodTypes,
          metadata: mergedMetadata,
          updated_at: new Date().toISOString(),
          stripe_checkout_session_id: null,
          stripe_payment_intent_id: null,
        })
        .eq('id', existingPayment.id)
        .select('id')
        .single()

      if (updateErr) {
        return NextResponse.json({ error: 'Fehler beim Aktualisieren des Zahlungsdatensatzes' }, { status: 500 })
      }
      paymentId = updatedRecord.id

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
          amount_rappen: body.amount_rappen,
          currency: (body.currency || 'chf').toLowerCase(),
          status: 'pending',
          payment_method_types: paymentMethodTypes,
          metadata: mergedMetadata,
        })
        .select('id')
        .single()

      if (dbError) {
        return NextResponse.json({ error: 'Fehler beim Erstellen des Zahlungsdatensatzes' }, { status: 500 })
      }
      paymentId = paymentRecord.id
    }

    return NextResponse.json({
      paymentId
    })
  } catch (error) {
    console.error('Bank transfer creation error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unerwarteter Fehler bei der Zahlungsinitialisierung'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
