import Stripe from 'stripe'
import type {
  CreateCheckoutSessionParams,
  CreateCheckoutSessionResult,
  GetOrCreateStripeCustomerParams,
  CreateCustomerPortalSessionParams,
  CreateCustomerPortalSessionResult,
} from '@/types/payment'

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
 * Finds an existing Stripe Customer by email or creates a new one.
 */
export async function getOrCreateStripeCustomer(
  params: GetOrCreateStripeCustomerParams
): Promise<string> {
  const stripe = getStripeServerClient()
  const normalizedEmail = params.email.trim().toLowerCase()

  const existing = await stripe.customers.list({
    email: normalizedEmail,
    limit: 1,
  })

  if (existing.data.length > 0) {
    const customer = existing.data[0]
    if (params.userId && !customer.metadata?.user_id) {
      await stripe.customers.update(customer.id, {
        metadata: { ...customer.metadata, user_id: params.userId },
      })
    }
    return customer.id
  }

  const created = await stripe.customers.create({
    email: normalizedEmail,
    ...(params.name ? { name: params.name } : {}),
    metadata: params.userId ? { user_id: params.userId } : {},
  })

  return created.id
}

/**
 * Creates a Stripe Billing / Customer Portal session for a given Stripe customer ID.
 */
export async function createStripeCustomerPortalSession(
  params: CreateCustomerPortalSessionParams
): Promise<CreateCustomerPortalSessionResult> {
  const stripe = getStripeServerClient()
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: params.customerId,
    return_url: params.returnUrl,
  })

  return {
    url: portalSession.url,
  }
}

export interface SystemTransactionForInvoice {
  id: string
  anmeldung_id: string | null
  user_id: string | null
  stripe_checkout_session_id: string | null
  stripe_payment_intent_id: string | null
  amount_rappen: number
  currency: string
  status: string
  payment_method_types: string[] | null
  metadata: Record<string, unknown> | null
  created_at: string
  course_name: string
  beneficiary_name: string
}

function formatPaymentMethodLabel(methods: string[] | null | undefined): string {
  if (!methods || methods.length === 0) return 'Stripe'
  if (methods.includes('bank_transfer')) return 'QR-Rechnung / Überweisung'
  if (methods.includes('twint') && methods.includes('card')) return 'TWINT / Karte'
  if (methods.includes('twint')) return 'TWINT'
  if (methods.includes('card')) return 'Kreditkarte'
  return methods.join(', ')
}

function truncateField(value: string, maxLen = 30): string {
  const clean = value.trim()
  if (!clean) return '-'
  return clean.length > maxLen ? `${clean.slice(0, maxLen - 1)}…` : clean
}

/**
 * Synchronizes transactions from our database (public.payments) into Stripe Invoices
 * for the given customerId so every system transaction appears in the Stripe Customer Portal.
 */
export async function syncSystemPaymentsToStripeInvoices(params: {
  customerId: string
  userId: string
  transactions: SystemTransactionForInvoice[]
  onInvoiceSynced?: (paymentId: string, stripeInvoiceId: string) => Promise<void>
  onInvoicePaidInStripe?: (paymentId: string, invoice: Stripe.Invoice) => Promise<void>
}): Promise<void> {
  const stripe = getStripeServerClient()
  const { customerId, userId, transactions, onInvoiceSynced, onInvoicePaidInStripe } = params

  if (transactions.length === 0) return

  // Fetch existing invoices for this customer to avoid duplicates
  const existingInvoicesList = await stripe.invoices.list({
    customer: customerId,
    limit: 100,
  })

  const invoiceById = new Map<string, Stripe.Invoice>()
  const invoiceByPaymentId = new Map<string, Stripe.Invoice>()
  const invoiceByAnmeldungId = new Map<string, Stripe.Invoice>()

  for (const inv of existingInvoicesList.data) {
    if (inv.status === 'void') continue
    invoiceById.set(inv.id, inv)
    const metaPaymentId = inv.metadata?.payment_id
    if (metaPaymentId) {
      invoiceByPaymentId.set(metaPaymentId, inv)
    }
    const metaAnmeldungId = inv.metadata?.anmeldung_id
    if (metaAnmeldungId) {
      invoiceByAnmeldungId.set(metaAnmeldungId, inv)
    }
  }

  // Process oldest first so invoices appear in chronological order in Stripe
  const chronological = [...transactions].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  for (const tx of chronological) {
    if (!tx.amount_rappen || tx.amount_rappen <= 0) continue
    // Only sync succeeded, pending/processing, or refunded transactions
    if (!['succeeded', 'pending', 'processing', 'refunded'].includes(tx.status)) {
      continue
    }

    try {
      const meta = tx.metadata || {}
      const storedInvoiceId =
        typeof meta.stripe_invoice_id === 'string' ? meta.stripe_invoice_id : null

      let matchedInvoice: Stripe.Invoice | undefined =
        (storedInvoiceId ? invoiceById.get(storedInvoiceId) : undefined) ||
        invoiceByPaymentId.get(tx.id) ||
        (tx.anmeldung_id ? invoiceByAnmeldungId.get(tx.anmeldung_id) : undefined)

      // Check if the Stripe Checkout Session itself already created an invoice on this customer
      if (!matchedInvoice && tx.stripe_checkout_session_id) {
        try {
          const session = await stripe.checkout.sessions.retrieve(tx.stripe_checkout_session_id)
          const sessionInvoiceId =
            typeof session.invoice === 'string'
              ? session.invoice
              : session.invoice?.id || null

          if (sessionInvoiceId) {
            const retrievedInv =
              invoiceById.get(sessionInvoiceId) ||
              (await stripe.invoices.retrieve(sessionInvoiceId))
            const invCustomerId =
              typeof retrievedInv.customer === 'string'
                ? retrievedInv.customer
                : retrievedInv.customer?.id
            if (invCustomerId === customerId && retrievedInv.status !== 'void') {
              matchedInvoice = retrievedInv
              invoiceById.set(retrievedInv.id, retrievedInv)
            }
          }
        } catch {
          // Checkout session might not exist in current Stripe environment; proceed to create invoice
        }
      }

      if (matchedInvoice) {
        // Case 1: The invoice was paid in the Stripe Customer Portal while still pending in our DB
        if (tx.status !== 'succeeded' && tx.status !== 'refunded' && matchedInvoice.status === 'paid') {
          if (onInvoicePaidInStripe) {
            await onInvoicePaidInStripe(tx.id, matchedInvoice)
          }
        } else {
          // Case 2: Our system marks the transaction as succeeded, ensure the Stripe invoice is finalized and paid
          if (tx.status === 'succeeded' && matchedInvoice.status === 'draft') {
            matchedInvoice = await stripe.invoices.finalizeInvoice(matchedInvoice.id)
          }
          if (tx.status === 'succeeded' && matchedInvoice.status === 'open') {
            await stripe.invoices.pay(matchedInvoice.id, { paid_out_of_band: true })
          }
        }
        if (storedInvoiceId !== matchedInvoice.id && onInvoiceSynced) {
          await onInvoiceSynced(tx.id, matchedInvoice.id)
        }
        continue
      }

      // No Stripe Invoice exists yet for this system transaction -> create one
      const formattedDate = new Date(tx.created_at).toLocaleDateString('de-CH', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
      const paymentMethodLabel = formatPaymentMethodLabel(tx.payment_method_types)
      const currency = (tx.currency || 'chf').toLowerCase()

      const draftInvoice = await stripe.invoices.create({
        customer: customerId,
        currency,
        collection_method: 'send_invoice',
        days_until_due: 30,
        description: `${tx.course_name} – ${tx.beneficiary_name}`,
        footer: `ZAP Transaktions-ID: ${tx.id} | Zahlungsdatum: ${formattedDate}`,
        custom_fields: [
          { name: 'Teilnehmer/in', value: truncateField(tx.beneficiary_name) },
          { name: 'Zahlungsart', value: truncateField(paymentMethodLabel) },
          { name: 'Buchungsdatum', value: truncateField(formattedDate) },
        ],
        metadata: {
          payment_id: tx.id,
          anmeldung_id: tx.anmeldung_id || '',
          user_id: userId,
          synced_from_system: 'true',
        },
      })

      await stripe.invoiceItems.create({
        customer: customerId,
        invoice: draftInvoice.id,
        amount: tx.amount_rappen,
        currency,
        description: `${tx.course_name} (${tx.beneficiary_name}) – ${formattedDate}`,
      })

      const finalizedInvoice = await stripe.invoices.finalizeInvoice(draftInvoice.id)

      if (tx.status === 'succeeded' || tx.status === 'refunded') {
        await stripe.invoices.pay(finalizedInvoice.id, { paid_out_of_band: true })
      }

      invoiceById.set(finalizedInvoice.id, finalizedInvoice)
      invoiceByPaymentId.set(tx.id, finalizedInvoice)
      if (tx.anmeldung_id) {
        invoiceByAnmeldungId.set(tx.anmeldung_id, finalizedInvoice)
      }

      if (onInvoiceSynced) {
        await onInvoiceSynced(tx.id, finalizedInvoice.id)
      }
    } catch (err) {
      console.error(`Failed to sync system payment ${tx.id} to Stripe invoice:`, err)
    }
  }
}

/**
 * Marks a payment in our database (public.payments) as succeeded and triggers course/material
 * fulfillment when its corresponding Stripe Invoice has been paid in the Stripe Customer Portal.
 */
export async function fulfillSystemPaymentFromStripeInvoice(params: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminSupabase: any
  invoice: Stripe.Invoice
  fallbackPaymentId?: string
}): Promise<boolean> {
  const { adminSupabase, invoice, fallbackPaymentId } = params

  if (invoice.status !== 'paid') {
    return false
  }

  const metaPaymentId = invoice.metadata?.payment_id || fallbackPaymentId || null
  const metaAnmeldungId = invoice.metadata?.anmeldung_id || null

  // 1. Locate the payment record in public.payments
  let paymentRow: {
    id: string
    anmeldung_id: string | null
    status: string
    stripe_checkout_session_id: string | null
    stripe_payment_intent_id: string | null
    metadata: Record<string, unknown> | null
  } | null = null

  if (metaPaymentId) {
    const { data } = await adminSupabase
      .from('payments')
      .select('id, anmeldung_id, status, stripe_checkout_session_id, stripe_payment_intent_id, metadata')
      .eq('id', metaPaymentId)
      .maybeSingle()
    if (data) paymentRow = data
  }

  if (!paymentRow) {
    const { data } = await adminSupabase
      .from('payments')
      .select('id, anmeldung_id, status, stripe_checkout_session_id, stripe_payment_intent_id, metadata')
      .eq('metadata->>stripe_invoice_id', invoice.id)
      .maybeSingle()
    if (data) paymentRow = data
  }

  if (!paymentRow && metaAnmeldungId) {
    const { data } = await adminSupabase
      .from('payments')
      .select('id, anmeldung_id, status, stripe_checkout_session_id, stripe_payment_intent_id, metadata')
      .eq('anmeldung_id', metaAnmeldungId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (data) paymentRow = data
  }

  if (!paymentRow) {
    return false
  }

  if (paymentRow.status === 'succeeded') {
    return true
  }

  // Extract payment_intent from invoice if available, or resolve via invoicePayments (Stripe API 2025+)
  const rawInvoicePi = (invoice as unknown as { payment_intent?: string | { id: string } | null }).payment_intent
  let invoicePaymentIntentId =
    typeof rawInvoicePi === 'string'
      ? rawInvoicePi
      : rawInvoicePi?.id || null

  if (!invoicePaymentIntentId && !paymentRow.stripe_payment_intent_id) {
    try {
      const stripe = getStripeServerClient()
      const invoicePayments = await stripe.invoicePayments.list({
        invoice: invoice.id,
        limit: 5,
      })
      for (const ip of invoicePayments.data) {
        const pi = ip.payment?.payment_intent
        const piId = typeof pi === 'string' ? pi : pi?.id || null
        if (piId) {
          invoicePaymentIntentId = piId
          break
        }
      }
    } catch {
      // Fall back to synthesized invoice reference below
    }
  }

  const effectivePaymentIntentId =
    paymentRow.stripe_payment_intent_id ||
    invoicePaymentIntentId ||
    `inv_${invoice.id}`

  // Ensure the row has stripe_payment_intent_id set so process_stripe_payment_update can locate it atomically
  if (!paymentRow.stripe_payment_intent_id) {
    await adminSupabase
      .from('payments')
      .update({
        stripe_payment_intent_id: effectivePaymentIntentId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentRow.id)
  }

  const existingMeta = (paymentRow.metadata as Record<string, unknown> | null) || {}

  const { error: rpcError } = await adminSupabase.rpc('process_stripe_payment_update', {
    p_checkout_session_id: paymentRow.stripe_checkout_session_id,
    p_payment_intent_id: effectivePaymentIntentId,
    p_status: 'succeeded',
    p_metadata: {
      ...existingMeta,
      stripe_invoice_id: invoice.id,
      paid_via: 'stripe_customer_portal',
      paid_at: new Date().toISOString(),
    },
  })

  if (rpcError) {
    console.error('Error in process_stripe_payment_update for invoice payment:', rpcError)
    // Fallback direct update
    await adminSupabase
      .from('payments')
      .update({
        status: 'succeeded',
        metadata: {
          ...existingMeta,
          stripe_invoice_id: invoice.id,
          paid_via: 'stripe_customer_portal',
          paid_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentRow.id)

    if (paymentRow.anmeldung_id) {
      await adminSupabase
        .from('intensivwoche_anmeldungen')
        .update({
          status: 'confirmed',
          paid_at: new Date().toISOString(),
        })
        .eq('id', paymentRow.anmeldung_id)
    }
  }

  // Cancel any other non-succeeded payment rows for the same course registration
  if (paymentRow.anmeldung_id) {
    await adminSupabase
      .from('payments')
      .update({ status: 'canceled', updated_at: new Date().toISOString() })
      .eq('anmeldung_id', paymentRow.anmeldung_id)
      .neq('id', paymentRow.id)
      .neq('status', 'succeeded')
  }

  return true
}

/**
 * Checks if any non-succeeded payments for a user have a corresponding paid Stripe Invoice
 * (e.g. when a user pays a bank transfer / open invoice in the Stripe Customer Portal and returns to /profil)
 * and marks them as succeeded in the database.
 */
export async function reconcilePendingPaymentsWithStripeInvoices(params: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminSupabase: any
  email: string | null
  payments: Array<{
    id: string
    anmeldung_id: string | null
    status: string
    metadata: unknown
  }>
}): Promise<boolean> {
  const { adminSupabase, email, payments } = params
  const pendingPayments = payments.filter(
    (p) => p.status === 'pending' || p.status === 'processing'
  )

  if (pendingPayments.length === 0) return false

  try {
    const stripe = getStripeServerClient()
    let anyUpdated = false

    // 1. Check payments that already have stripe_invoice_id stored in metadata
    const checkedInvoiceIds = new Set<string>()
    for (const p of pendingPayments) {
      const meta = (p.metadata as Record<string, unknown> | null) || {}
      const invoiceId = typeof meta.stripe_invoice_id === 'string' ? meta.stripe_invoice_id : null
      if (!invoiceId) continue

      checkedInvoiceIds.add(invoiceId)
      try {
        const invoice = await stripe.invoices.retrieve(invoiceId)
        if (invoice.status === 'paid') {
          const updated = await fulfillSystemPaymentFromStripeInvoice({
            adminSupabase,
            invoice,
            fallbackPaymentId: p.id,
          })
          if (updated) anyUpdated = true
        }
      } catch {
        // Ignore individual lookup errors
      }
    }

    // 2. Also check paid invoices on the customer by email in case metadata wasn't linked yet
    if (email) {
      const customers = await stripe.customers.list({
        email: email.trim().toLowerCase(),
        limit: 1,
      })

      if (customers.data.length > 0) {
        const paidInvoices = await stripe.invoices.list({
          customer: customers.data[0].id,
          status: 'paid',
          limit: 50,
        })

        for (const inv of paidInvoices.data) {
          if (checkedInvoiceIds.has(inv.id)) continue
          const metaPaymentId = inv.metadata?.payment_id
          const metaAnmeldungId = inv.metadata?.anmeldung_id
          const matchesPending = pendingPayments.some(
            (p) =>
              p.id === metaPaymentId ||
              (p.anmeldung_id && p.anmeldung_id === metaAnmeldungId)
          )
          if (matchesPending) {
            const updated = await fulfillSystemPaymentFromStripeInvoice({
              adminSupabase,
              invoice: inv,
            })
            if (updated) anyUpdated = true
          }
        }
      }
    }

    return anyUpdated
  } catch (err) {
    console.warn('Could not reconcile pending payments with Stripe invoices:', err)
    return false
  }
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

  // Resolve or create a Stripe Customer when email is provided so payments & invoices appear in the Customer Portal
  let customerId: string | undefined
  if (params.customer_email) {
    try {
      customerId = await getOrCreateStripeCustomer({
        email: params.customer_email,
        userId: params.user_id,
      })
    } catch (err) {
      console.warn('Could not resolve Stripe customer, falling back to customer_email:', err)
    }
  }

  const itemName = params.description || params.metadata?.kurs_name || 'ZAP Kurs / Angebot'
  const beneficiaryName = params.metadata?.beneficiary_name || 'Mich selbst'

  const session = await stripe.checkout.sessions.create({
    payment_method_types: paymentMethodTypes,
    line_items: [
      {
        price_data: {
          currency: currency,
          product_data: {
            name: itemName,
          },
          unit_amount: params.amount_rappen,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    ...(customerId
      ? { customer: customerId }
      : { customer_email: params.customer_email, customer_creation: 'always' as const }),
    invoice_creation: {
      enabled: true,
      invoice_data: {
        description: `${itemName} – ${beneficiaryName}`,
        custom_fields: [
          { name: 'Teilnehmer/in', value: truncateField(beneficiaryName) },
          { name: 'Angebot', value: truncateField(itemName) },
        ],
        metadata: {
          anmeldung_id: params.anmeldung_id || '',
          user_id: params.user_id || '',
          ...(params.metadata || {}),
        },
      },
    },
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

interface RefundPaymentRow {
  id: string
  anmeldung_id: string | null
  status: string
  stripe_checkout_session_id: string | null
  stripe_payment_intent_id: string | null
  metadata: Record<string, unknown> | null
}

/**
 * Resolves a local payment record from a Stripe refund/charge event and marks it as refunded
 * via process_stripe_payment_update (revoking course access and material grants).
 */
export async function refundSystemPaymentFromStripe(params: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminSupabase: any
  paymentIntentId: string | null
  invoiceId?: string | null
  amountRefunded?: number | null
  metadata?: Record<string, unknown>
}): Promise<{ updated: boolean; error?: unknown }> {
  const { adminSupabase, paymentIntentId, amountRefunded, metadata } = params
  let invoiceId = params.invoiceId || null

  const selectColumns =
    'id, anmeldung_id, status, stripe_checkout_session_id, stripe_payment_intent_id, metadata'

  let paymentRow: RefundPaymentRow | null = null

  const findByInvoiceId = async (invId: string): Promise<RefundPaymentRow | null> => {
    const { data: byMeta } = await adminSupabase
      .from('payments')
      .select(selectColumns)
      .eq('metadata->>stripe_invoice_id', invId)
      .maybeSingle()
    if (byMeta) return byMeta as RefundPaymentRow

    const { data: bySynthPi } = await adminSupabase
      .from('payments')
      .select(selectColumns)
      .eq('stripe_payment_intent_id', `inv_${invId}`)
      .maybeSingle()
    return (bySynthPi as RefundPaymentRow | null) || null
  }

  // 1. Direct match by stripe_payment_intent_id
  if (paymentIntentId) {
    const { data } = await adminSupabase
      .from('payments')
      .select(selectColumns)
      .eq('stripe_payment_intent_id', paymentIntentId)
      .maybeSingle()
    if (data) paymentRow = data as RefundPaymentRow
  }

  // 2. Match by invoice ID (covers Customer Portal invoice payments where stripe_payment_intent_id is inv_...)
  if (!paymentRow && invoiceId) {
    paymentRow = await findByInvoiceId(invoiceId)
  }

  // 3. Fallback via Stripe API: resolve Checkout Session or PaymentIntent/Invoice metadata
  if (!paymentRow && paymentIntentId) {
    const stripe = getStripeServerClient()

    try {
      const sessions = await stripe.checkout.sessions.list({
        payment_intent: paymentIntentId,
        limit: 1,
      })
      const sessionId = sessions.data[0]?.id
      if (sessionId) {
        const { data } = await adminSupabase
          .from('payments')
          .select(selectColumns)
          .eq('stripe_checkout_session_id', sessionId)
          .maybeSingle()
        if (data) paymentRow = data as RefundPaymentRow
      }
    } catch {
      // Continue to PaymentIntent lookup
    }

    if (!paymentRow) {
      try {
        const invoicePayments = await stripe.invoicePayments.list({
          payment: { type: 'payment_intent', payment_intent: paymentIntentId },
          limit: 5,
        })
        for (const ip of invoicePayments.data) {
          const ipInvoiceId =
            typeof ip.invoice === 'string' ? ip.invoice : ip.invoice?.id || null
          if (ipInvoiceId) {
            if (!invoiceId) invoiceId = ipInvoiceId
            paymentRow = await findByInvoiceId(ipInvoiceId)
            if (paymentRow) break
          }
        }
      } catch {
        // Continue to PaymentIntent lookup
      }
    }

    if (!paymentRow) {
      try {
        const pi = await stripe.paymentIntents.retrieve(paymentIntentId)
        const rawPiInvoice = (pi as unknown as { invoice?: string | { id: string } | null }).invoice
        const piInvoiceId =
          typeof rawPiInvoice === 'string' ? rawPiInvoice : rawPiInvoice?.id || null

        if (piInvoiceId && !invoiceId) {
          invoiceId = piInvoiceId
          paymentRow = await findByInvoiceId(piInvoiceId)
        }

        const metaPaymentId = pi.metadata?.payment_id
        if (!paymentRow && metaPaymentId) {
          const { data } = await adminSupabase
            .from('payments')
            .select(selectColumns)
            .eq('id', metaPaymentId)
            .maybeSingle()
          if (data) paymentRow = data as RefundPaymentRow
        }

        const metaAnmeldungId = pi.metadata?.anmeldung_id
        if (!paymentRow && metaAnmeldungId) {
          const { data } = await adminSupabase
            .from('payments')
            .select(selectColumns)
            .eq('anmeldung_id', metaAnmeldungId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          if (data) paymentRow = data as RefundPaymentRow
        }
      } catch {
        // Continue to metadata fallback
      }
    }
  }

  // 4. Fallback via Stripe Invoice metadata if invoiceId is known
  if (!paymentRow && invoiceId) {
    try {
      const stripe = getStripeServerClient()
      const inv = await stripe.invoices.retrieve(invoiceId)
      const metaPaymentId = inv.metadata?.payment_id
      if (metaPaymentId) {
        const { data } = await adminSupabase
          .from('payments')
          .select(selectColumns)
          .eq('id', metaPaymentId)
          .maybeSingle()
        if (data) paymentRow = data as RefundPaymentRow
      }
      if (!paymentRow && inv.metadata?.anmeldung_id) {
        const { data } = await adminSupabase
          .from('payments')
          .select(selectColumns)
          .eq('anmeldung_id', inv.metadata.anmeldung_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (data) paymentRow = data as RefundPaymentRow
      }
    } catch {
      // Ignore lookup errors
    }
  }

  // 5. Fallback via metadata.payment_id passed from charge/refund
  if (!paymentRow && typeof metadata?.payment_id === 'string' && metadata.payment_id) {
    const { data } = await adminSupabase
      .from('payments')
      .select(selectColumns)
      .eq('id', metadata.payment_id)
      .maybeSingle()
    if (data) paymentRow = data as RefundPaymentRow
  }

  if (!paymentRow) {
    console.warn(
      `Stripe refund webhook could not match a payment record (payment_intent=${paymentIntentId}, invoice=${invoiceId})`
    )
    return { updated: false }
  }

  if (paymentRow.status === 'refunded') {
    return { updated: true }
  }

  // Ensure process_stripe_payment_update can locate the row by stripe_payment_intent_id or stripe_checkout_session_id
  let effectivePaymentIntentId = paymentIntentId || paymentRow.stripe_payment_intent_id
  if (
    paymentIntentId &&
    (!paymentRow.stripe_payment_intent_id || paymentRow.stripe_payment_intent_id.startsWith('inv_'))
  ) {
    await adminSupabase
      .from('payments')
      .update({
        stripe_payment_intent_id: paymentIntentId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentRow.id)
  } else if (!paymentRow.stripe_checkout_session_id && !effectivePaymentIntentId) {
    effectivePaymentIntentId = invoiceId ? `inv_${invoiceId}` : `pay_${paymentRow.id}`
    await adminSupabase
      .from('payments')
      .update({
        stripe_payment_intent_id: effectivePaymentIntentId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentRow.id)
  }

  const existingMeta = paymentRow.metadata || {}
  const { error: rpcError } = await adminSupabase.rpc('process_stripe_payment_update', {
    p_checkout_session_id: paymentRow.stripe_checkout_session_id,
    p_payment_intent_id: effectivePaymentIntentId,
    p_status: 'refunded',
    p_metadata: {
      ...existingMeta,
      ...(amountRefunded != null ? { amount_refunded: amountRefunded } : {}),
      refunded_at: new Date().toISOString(),
      ...(metadata || {}),
    },
  })

  if (rpcError) {
    return { updated: false, error: rpcError }
  }

  return { updated: true }
}

/**
 * Ensures a single payment record (e.g. a bank-transfer / QR invoice) is synced
 * to a finalized Stripe Invoice so it immediately appears in the Stripe Dashboard
 * and Customer Portal.
 */
export async function ensureStripeInvoiceForPayment(params: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminSupabase: any
  paymentId: string
  fallbackEmail?: string | null
  fallbackName?: string | null
}): Promise<string | null> {
  const { adminSupabase, paymentId, fallbackEmail, fallbackName } = params

  const { data: payment } = await adminSupabase
    .from('payments')
    .select(
      'id, anmeldung_id, user_id, stripe_checkout_session_id, stripe_payment_intent_id, amount_rappen, currency, status, payment_method_types, metadata, created_at'
    )
    .eq('id', paymentId)
    .maybeSingle()

  if (!payment || !payment.amount_rappen || payment.amount_rappen <= 0) {
    return null
  }

  const meta = (payment.metadata as Record<string, unknown> | null) || {}
  if (typeof meta.stripe_invoice_id === 'string' && meta.stripe_invoice_id) {
    return meta.stripe_invoice_id
  }

  let email =
    (typeof meta.customer_email === 'string' && meta.customer_email) ||
    (typeof meta.payer_email === 'string' && meta.payer_email) ||
    fallbackEmail ||
    null

  let customerName =
    (typeof meta.payer_name === 'string' && meta.payer_name) ||
    fallbackName ||
    null

  if ((!email || !customerName) && payment.user_id) {
    const { data: userRow } = await adminSupabase
      .from('user')
      .select('email, name, first_name, last_name')
      .eq('id', payment.user_id)
      .maybeSingle()

    if (userRow) {
      if (!email && userRow.email) email = userRow.email
      if (!customerName) {
        customerName =
          userRow.name ||
          [userRow.first_name, userRow.last_name].filter(Boolean).join(' ') ||
          null
      }
    }
  }

  if (!email) {
    return null
  }

  let courseName =
    (typeof meta.kurs_name === 'string' ? meta.kurs_name : null) ||
    (typeof meta.description === 'string' ? meta.description : null) ||
    (payment.anmeldung_id ? 'Kursbuchung' : 'ZAP Rechnung')

  let beneficiaryName =
    typeof meta.beneficiary_name === 'string' ? meta.beneficiary_name : null

  if (payment.anmeldung_id) {
    const { data: anm } = await adminSupabase
      .from('intensivwoche_anmeldungen')
      .select('child_firstname, child_lastname, intensivwoche_kurse(name)')
      .eq('id', payment.anmeldung_id)
      .maybeSingle()

    if (anm) {
      const kursName = (anm.intensivwoche_kurse as { name?: string } | null)?.name
      if (kursName) courseName = kursName
      if (!beneficiaryName && (anm.child_firstname || anm.child_lastname)) {
        beneficiaryName = [anm.child_firstname, anm.child_lastname].filter(Boolean).join(' ')
      }
    }
  }

  const customerId = await getOrCreateStripeCustomer({
    email,
    name: customerName || undefined,
    userId: payment.user_id || undefined,
  })

  let syncedInvoiceId: string | null = null

  await syncSystemPaymentsToStripeInvoices({
    customerId,
    userId: payment.user_id || '',
    transactions: [
      {
        id: payment.id,
        anmeldung_id: payment.anmeldung_id,
        user_id: payment.user_id,
        stripe_checkout_session_id: payment.stripe_checkout_session_id,
        stripe_payment_intent_id: payment.stripe_payment_intent_id,
        amount_rappen: payment.amount_rappen,
        currency: payment.currency || 'chf',
        status: payment.status,
        payment_method_types: payment.payment_method_types,
        metadata: meta,
        created_at: payment.created_at,
        course_name: courseName,
        beneficiary_name: beneficiaryName || customerName || 'Mich selbst',
      },
    ],
    onInvoiceSynced: async (syncedPaymentId, stripeInvoiceId) => {
      syncedInvoiceId = stripeInvoiceId
      await adminSupabase
        .from('payments')
        .update({
          metadata: {
            ...meta,
            stripe_invoice_id: stripeInvoiceId,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', syncedPaymentId)
    },
    onInvoicePaidInStripe: async (paidPaymentId, invoice) => {
      await fulfillSystemPaymentFromStripeInvoice({
        adminSupabase,
        invoice,
        fallbackPaymentId: paidPaymentId,
      })
    },
  })

  return syncedInvoiceId
}



