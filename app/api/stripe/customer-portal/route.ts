import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import {
  getOrCreateStripeCustomer,
  createStripeCustomerPortalSession,
  syncSystemPaymentsToStripeInvoices,
  type SystemTransactionForInvoice,
} from '@/lib/stripe'

interface EnrichedAnmeldungRow {
  id: string
  child_firstname: string | null
  child_lastname: string | null
  beneficiary_user_id: string | null
  kurs_id: number | null
  intensivwoche_kurse: { name: string; fach: string } | null
}

export async function POST(req: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert' },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const adminSupabase = createAdminSupabaseClient()
    const { data: userRecord, error: userError } = await adminSupabase
      .from('user')
      .select('id, email, name, first_name, last_name, account_type, parent_id')
      .eq('id', userId)
      .maybeSingle()

    if (userError) {
      console.error('Error fetching user for Stripe customer portal:', userError)
      return NextResponse.json(
        { error: 'Benutzerprofil konnte nicht überprüft werden.' },
        { status: 500 }
      )
    }

    const isChild =
      session.user.accountType === 'child' ||
      userRecord?.account_type === 'child' ||
      Boolean(userRecord?.parent_id)

    if (isChild) {
      return NextResponse.json(
        { error: 'Das Stripe-Kundenportal ist nur für Elternkonten verfügbar.' },
        { status: 403 }
      )
    }

    const email = userRecord?.email || session.user.email
    if (!email) {
      return NextResponse.json(
        { error: 'Keine E-Mail-Adresse für dieses Konto hinterlegt.' },
        { status: 400 }
      )
    }

    const fullName =
      [userRecord?.first_name, userRecord?.last_name].filter(Boolean).join(' ').trim() ||
      userRecord?.name ||
      session.user.name ||
      null

    const origin = new URL(req.url).origin
    let returnUrl = `${origin}/profil`

    try {
      const body = (await req.json()) as { return_url?: string }
      if (body?.return_url) {
        const parsedReturn = new URL(body.return_url, origin)
        if (parsedReturn.origin === origin) {
          returnUrl = parsedReturn.toString()
        }
      }
    } catch {
      // Optional JSON body — fall back to default /profil return URL
    }

    const customerId = await getOrCreateStripeCustomer({
      email,
      name: fullName,
      userId,
    })

    // Fetch and sync parent's transactions from our system (public.payments) into Stripe Invoices
    try {
      const filterConditions = [
        `user_id.eq.${userId}`,
        `metadata->>customer_email.eq.${email}`,
      ]

      const { data: rawPayments } = await adminSupabase
        .from('payments')
        .select('*')
        .or(filterConditions.join(','))
        .order('created_at', { ascending: false })

      const rawPaymentsList = rawPayments || []

      if (rawPaymentsList.length > 0) {
        // Deduplicate by anmeldung_id (keep succeeded if any, otherwise latest) + standalone payments
        const paymentsByAnmeldung = new Map<string, (typeof rawPaymentsList)[number]>()
        const standalonePayments: (typeof rawPaymentsList)[number][] = []

        for (const p of rawPaymentsList) {
          if (!p.anmeldung_id) {
            standalonePayments.push(p)
          } else {
            const existing = paymentsByAnmeldung.get(p.anmeldung_id)
            if (!existing) {
              paymentsByAnmeldung.set(p.anmeldung_id, p)
            } else if (existing.status !== 'succeeded' && p.status === 'succeeded') {
              paymentsByAnmeldung.set(p.anmeldung_id, p)
            }
          }
        }

        const deduplicatedPayments = [
          ...Array.from(paymentsByAnmeldung.values()),
          ...standalonePayments,
        ]

        const anmeldungIds = deduplicatedPayments
          .map((p) => p.anmeldung_id)
          .filter(Boolean) as string[]

        const [{ data: anmeldungenData }, { data: childrenData }] = await Promise.all([
          anmeldungIds.length > 0
            ? adminSupabase
                .from('intensivwoche_anmeldungen')
                .select(`
                  id,
                  child_firstname,
                  child_lastname,
                  beneficiary_user_id,
                  kurs_id,
                  intensivwoche_kurse ( name, fach )
                `)
                .in('id', anmeldungIds)
            : Promise.resolve({ data: [] }),
          adminSupabase
            .from('user')
            .select('id, name, first_name, last_name')
            .eq('parent_id', userId),
        ])

        const anmeldungMap = new Map<string, EnrichedAnmeldungRow>()
        if (anmeldungenData) {
          for (const a of anmeldungenData) {
            anmeldungMap.set(a.id, a as unknown as EnrichedAnmeldungRow)
          }
        }

        const childMap = new Map<string, string>()
        if (childrenData) {
          for (const c of childrenData) {
            const cName =
              c.name || [c.first_name, c.last_name].filter(Boolean).join(' ') || 'Kind'
            childMap.set(c.id, cName)
          }
        }

        const transactionsToSync: SystemTransactionForInvoice[] = deduplicatedPayments.map((p) => {
          const meta = (p.metadata as Record<string, unknown> | null) || {}
          const anmeldung = p.anmeldung_id ? anmeldungMap.get(p.anmeldung_id) : null

          const courseName =
            (anmeldung?.intensivwoche_kurse as { name?: string } | null)?.name ||
            (typeof meta.kurs_name === 'string' ? meta.kurs_name : null) ||
            (typeof meta.description === 'string' ? meta.description : null) ||
            (p.anmeldung_id ? 'Kursbuchung' : 'Stripe Zahlung')

          const beneficiaryUserId =
            anmeldung?.beneficiary_user_id ||
            (typeof meta.beneficiary_user_id === 'string' ? meta.beneficiary_user_id : null)

          let beneficiaryName =
            (typeof meta.beneficiary_name === 'string' ? meta.beneficiary_name : null) ||
            (beneficiaryUserId && childMap.has(beneficiaryUserId)
              ? childMap.get(beneficiaryUserId)
              : null) ||
            (anmeldung?.child_firstname || anmeldung?.child_lastname
              ? [anmeldung.child_firstname, anmeldung.child_lastname].filter(Boolean).join(' ')
              : null)

          const isForChild = Boolean(
            (beneficiaryUserId && beneficiaryUserId !== userId) ||
              meta.booking_mode === 'child' ||
              (beneficiaryUserId && childMap.has(beneficiaryUserId))
          )

          if (!beneficiaryName) {
            beneficiaryName = isForChild ? 'Kind' : fullName || 'Mich selbst'
          }

          return {
            id: p.id,
            anmeldung_id: p.anmeldung_id,
            user_id: p.user_id,
            stripe_checkout_session_id: p.stripe_checkout_session_id,
            stripe_payment_intent_id: p.stripe_payment_intent_id,
            amount_rappen: p.amount_rappen,
            currency: p.currency,
            status: p.status,
            payment_method_types: p.payment_method_types,
            metadata: meta,
            created_at: p.created_at,
            course_name: courseName,
            beneficiary_name: beneficiaryName,
          }
        })

        await syncSystemPaymentsToStripeInvoices({
          customerId,
          userId,
          transactions: transactionsToSync,
          onInvoiceSynced: async (paymentId, stripeInvoiceId) => {
            const target = rawPaymentsList.find((r) => r.id === paymentId)
            const currentMeta =
              (target?.metadata as Record<string, unknown> | null) || {}
            await adminSupabase
              .from('payments')
              .update({
                metadata: {
                  ...currentMeta,
                  stripe_invoice_id: stripeInvoiceId,
                },
                updated_at: new Date().toISOString(),
              })
              .eq('id', paymentId)
          },
        })
      }
    } catch (syncError) {
      console.error('Non-fatal error syncing system transactions to Stripe invoices:', syncError)
    }

    const portalSession = await createStripeCustomerPortalSession({
      customerId,
      returnUrl,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (error) {
    console.error('Stripe customer portal error:', error)
    const message =
      error instanceof Error
        ? error.message
        : 'Fehler beim Öffnen des Stripe-Kundenportals'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
