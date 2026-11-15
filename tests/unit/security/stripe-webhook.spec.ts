import { test, expect } from '@playwright/test'
import '../helpers/mock-registry'
import {
  resetMocks,
  setMockHeaders,
  setMockSupabaseClients,
} from '../helpers/mock-registry'
import { createMockSupabase } from '../helpers/mock-supabase'
import Stripe from 'stripe'
import { POST as stripeWebhookPOST } from '@/app/api/webhooks/stripe/route'
import {
  getStripeServerClient,
  fulfillSystemPaymentFromStripeInvoice,
  refundSystemPaymentFromStripe,
} from '@/lib/stripe'

const TEST_STRIPE_SECRET_KEY = 'sk_test_webhook_spec_key_1234567890'
const TEST_WEBHOOK_SECRET = 'whsec_test_webhook_secret_key_1234567890'

function buildSignedWebhookRequest(
  eventPayload: Record<string, unknown>,
  options?: {
    secret?: string
    timestamp?: number
    overrideSignature?: string
    tamperedBody?: string
  }
) {
  process.env.STRIPE_SECRET_KEY = TEST_STRIPE_SECRET_KEY
  const stripe = getStripeServerClient()
  const payloadString = JSON.stringify(eventPayload)
  const signature =
    options?.overrideSignature ??
    stripe.webhooks.generateTestHeaderString({
      payload: payloadString,
      secret: options?.secret ?? TEST_WEBHOOK_SECRET,
      ...(options?.timestamp !== undefined ? { timestamp: options.timestamp } : {}),
    })

  setMockHeaders({ 'stripe-signature': signature })

  return new Request('http://localhost:3000/api/webhooks/stripe', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'stripe-signature': signature,
    },
    body: options?.tamperedBody ?? payloadString,
  })
}

test.describe('Stripe Webhook Security & Event Fulfillment (`app/api/webhooks/stripe/route.ts`)', () => {
  const originalWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const originalStripeSecret = process.env.STRIPE_SECRET_KEY

  test.beforeEach(() => {
    resetMocks()
    process.env.STRIPE_SECRET_KEY = TEST_STRIPE_SECRET_KEY
    process.env.STRIPE_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET
  })

  test.afterAll(() => {
    process.env.STRIPE_WEBHOOK_SECRET = originalWebhookSecret
    process.env.STRIPE_SECRET_KEY = originalStripeSecret
  })

  test('fails closed with HTTP 500 when STRIPE_WEBHOOK_SECRET is not configured', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET
    setMockHeaders({ 'stripe-signature': 't=12345,v1=deadbeef' })

    const req = new Request('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      body: JSON.stringify({ id: 'evt_1', type: 'checkout.session.completed' }),
    })

    const res = await stripeWebhookPOST(req)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toContain('Webhook secret is not configured')
  })

  test('rejects requests missing the stripe-signature header with HTTP 400', async () => {
    setMockHeaders({})

    const req = new Request('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      body: JSON.stringify({ id: 'evt_1', type: 'checkout.session.completed' }),
    })

    const res = await stripeWebhookPOST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Missing stripe-signature header')
  })

  test('rejects forged signatures signed with an attacker secret with HTTP 400', async () => {
    const mockDb = createMockSupabase()
    setMockSupabaseClients({ admin: mockDb })

    const req = buildSignedWebhookRequest(
      {
        id: 'evt_forged',
        object: 'event',
        type: 'checkout.session.completed',
        data: { object: { id: 'cs_test_forged', payment_status: 'paid' } },
      },
      { secret: 'whsec_attacker_wrong_secret_999999' }
    )

    const res = await stripeWebhookPOST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('Webhook Error:')
    expect(mockDb.calls).toHaveLength(0)
  })

  test('rejects tampered payloads where body was modified after signing with HTTP 400', async () => {
    const mockDb = createMockSupabase()
    setMockSupabaseClients({ admin: mockDb })

    const originalEvent = {
      id: 'evt_original',
      object: 'event',
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_test_1', payment_status: 'unpaid', amount_total: 1000 } },
    }
    const tamperedBody = JSON.stringify({
      ...originalEvent,
      data: { object: { id: 'cs_test_1', payment_status: 'paid', amount_total: 1000 } },
    })

    const req = buildSignedWebhookRequest(originalEvent, { tamperedBody })

    const res = await stripeWebhookPOST(req)
    expect(res.status).toBe(400)
    expect(mockDb.calls).toHaveLength(0)
  })

  test('rejects replay attacks with expired timestamps (> 5 minutes old) with HTTP 400', async () => {
    const mockDb = createMockSupabase()
    setMockSupabaseClients({ admin: mockDb })

    const tenMinutesAgo = Math.floor(Date.now() / 1000) - 600
    const req = buildSignedWebhookRequest(
      {
        id: 'evt_replay',
        object: 'event',
        type: 'checkout.session.completed',
        data: { object: { id: 'cs_test_replay', payment_status: 'paid' } },
      },
      { timestamp: tenMinutesAgo }
    )

    const res = await stripeWebhookPOST(req)
    expect(res.status).toBe(400)
    expect(mockDb.calls).toHaveLength(0)
  })

  test('checkout.session.completed (paid) invokes process_stripe_payment_update with status=succeeded and beneficiary/invoice metadata', async () => {
    const mockDb = createMockSupabase()
    setMockSupabaseClients({ admin: mockDb })

    const req = buildSignedWebhookRequest({
      id: 'evt_cs_paid',
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_paid_123',
          object: 'checkout.session',
          payment_intent: 'pi_test_123',
          invoice: 'in_test_123',
          payment_status: 'paid',
          customer_details: { email: 'parent@example.com' },
          metadata: {
            anmeldung_id: 'anm-123',
            beneficiary_user_id: 'child-456',
            kurs_id: 'kurs-789',
          },
        },
      },
    })

    const res = await stripeWebhookPOST(req)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ received: true })

    const rpcCall = mockDb.calls.find(
      (c) => c.kind === 'rpc' && c.target === 'process_stripe_payment_update'
    )
    expect(rpcCall).toBeDefined()
    expect(rpcCall?.payload).toEqual({
      p_checkout_session_id: 'cs_test_paid_123',
      p_payment_intent_id: 'pi_test_123',
      p_status: 'succeeded',
      p_metadata: {
        customer_email: 'parent@example.com',
        payment_status: 'paid',
        beneficiary_user_id: 'child-456',
        stripe_invoice_id: 'in_test_123',
        anmeldung_id: 'anm-123',
        kurs_id: 'kurs-789',
      },
    })
  })

  test('checkout.session.completed (unpaid) maps status to processing and handles object payment_intent/invoice', async () => {
    const mockDb = createMockSupabase()
    setMockSupabaseClients({ admin: mockDb })

    const req = buildSignedWebhookRequest({
      id: 'evt_cs_unpaid',
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_unpaid_456',
          object: 'checkout.session',
          payment_intent: { id: 'pi_obj_456' },
          invoice: { id: 'in_obj_456' },
          payment_status: 'unpaid',
          customer_details: null,
          metadata: {},
        },
      },
    })

    const res = await stripeWebhookPOST(req)
    expect(res.status).toBe(200)

    const rpcCall = mockDb.calls.find(
      (c) => c.kind === 'rpc' && c.target === 'process_stripe_payment_update'
    )
    expect(rpcCall?.payload).toMatchObject({
      p_checkout_session_id: 'cs_test_unpaid_456',
      p_payment_intent_id: 'pi_obj_456',
      p_status: 'processing',
      p_metadata: {
        customer_email: null,
        payment_status: 'unpaid',
        beneficiary_user_id: null,
        stripe_invoice_id: 'in_obj_456',
      },
    })
  })

  test('checkout.session.completed returns HTTP 500 so Stripe retries when database RPC fails', async () => {
    const mockDb = createMockSupabase({
      rpcs: {
        process_stripe_payment_update: { data: null, error: { message: 'deadlock detected' } },
      },
    })
    setMockSupabaseClients({ admin: mockDb })

    const req = buildSignedWebhookRequest({
      id: 'evt_cs_db_err',
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_err',
          payment_intent: 'pi_err',
          payment_status: 'paid',
        },
      },
    })

    const res = await stripeWebhookPOST(req)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Database update failed')
  })

  test('invoice.paid and invoice.payment_succeeded fulfill pending system payment and cancel sibling attempts', async () => {
    const mockDb = createMockSupabase({
      tables: {
        payments: (call) => {
          if (call.operation === 'select') {
            return {
              data: {
                id: 'pay-inv-1',
                anmeldung_id: 'anm-inv-1',
                status: 'pending',
                stripe_checkout_session_id: null,
                stripe_payment_intent_id: null,
                metadata: { kurs_id: 'kurs-1' },
              },
              error: null,
            }
          }
          return { data: null, error: null }
        },
      },
    })
    setMockSupabaseClients({ admin: mockDb })

    const req = buildSignedWebhookRequest({
      id: 'evt_inv_paid',
      object: 'event',
      type: 'invoice.paid',
      data: {
        object: {
          id: 'in_portal_paid_1',
          object: 'invoice',
          status: 'paid',
          payment_intent: 'pi_from_invoice_1',
          metadata: {
            payment_id: 'pay-inv-1',
            anmeldung_id: 'anm-inv-1',
          },
        },
      },
    })

    const res = await stripeWebhookPOST(req)
    expect(res.status).toBe(200)

    const rpcCall = mockDb.calls.find(
      (c) => c.kind === 'rpc' && c.target === 'process_stripe_payment_update'
    )
    expect(rpcCall).toBeDefined()
    expect(rpcCall?.payload).toMatchObject({
      p_checkout_session_id: null,
      p_payment_intent_id: 'pi_from_invoice_1',
      p_status: 'succeeded',
      p_metadata: expect.objectContaining({
        kurs_id: 'kurs-1',
        stripe_invoice_id: 'in_portal_paid_1',
        paid_via: 'stripe_customer_portal',
      }),
    })

    // Verifies sibling pending payments for the same anmeldung_id are canceled
    const siblingCancelCall = mockDb.calls.find(
      (c) =>
        c.kind === 'from' &&
        c.target === 'payments' &&
        c.operation === 'update' &&
        (c.payload as { status?: string })?.status === 'canceled'
    )
    expect(siblingCancelCall).toBeDefined()
  })

  test('payment_intent.succeeded and payment_intent.payment_failed update status via RPC', async () => {
    const mockDb = createMockSupabase()
    setMockSupabaseClients({ admin: mockDb })

    const succeededReq = buildSignedWebhookRequest({
      id: 'evt_pi_ok',
      object: 'event',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_ok_99',
          object: 'payment_intent',
          payment_method_types: ['twint'],
        },
      },
    })
    const res1 = await stripeWebhookPOST(succeededReq)
    expect(res1.status).toBe(200)

    const failedReq = buildSignedWebhookRequest({
      id: 'evt_pi_fail',
      object: 'event',
      type: 'payment_intent.payment_failed',
      data: {
        object: {
          id: 'pi_fail_99',
          object: 'payment_intent',
          last_payment_error: { message: 'Card declined by issuer' },
        },
      },
    })
    const res2 = await stripeWebhookPOST(failedReq)
    expect(res2.status).toBe(200)

    const rpcCalls = mockDb.calls.filter(
      (c) => c.kind === 'rpc' && c.target === 'process_stripe_payment_update'
    )
    expect(rpcCalls).toHaveLength(2)
    expect(rpcCalls[0].payload).toEqual({
      p_checkout_session_id: null,
      p_payment_intent_id: 'pi_ok_99',
      p_status: 'succeeded',
      p_metadata: { payment_method_types: ['twint'] },
    })
    expect(rpcCalls[1].payload).toEqual({
      p_checkout_session_id: null,
      p_payment_intent_id: 'pi_fail_99',
      p_status: 'failed',
      p_metadata: { last_payment_error: 'Card declined by issuer' },
    })
  })

  test('charge.refunded revokes course/material access via process_stripe_payment_update with status=refunded', async () => {
    const mockDb = createMockSupabase({
      tables: {
        payments: {
          select: {
            data: {
              id: 'pay-ref-1',
              anmeldung_id: 'anm-ref-1',
              status: 'succeeded',
              stripe_checkout_session_id: 'cs_test_ref_1',
              stripe_payment_intent_id: 'pi_ref_1',
              metadata: { kurs_id: 'kurs-ref-1' },
            },
          },
        },
      },
    })
    setMockSupabaseClients({ admin: mockDb })

    const req = buildSignedWebhookRequest({
      id: 'evt_charge_refunded',
      object: 'event',
      type: 'charge.refunded',
      data: {
        object: {
          id: 'ch_ref_1',
          object: 'charge',
          payment_intent: 'pi_ref_1',
          amount_refunded: 65000,
          metadata: { reason: 'requested_by_customer' },
        },
      },
    })

    const res = await stripeWebhookPOST(req)
    expect(res.status).toBe(200)

    const rpcCall = mockDb.calls.find(
      (c) => c.kind === 'rpc' && c.target === 'process_stripe_payment_update'
    )
    expect(rpcCall?.payload).toMatchObject({
      p_checkout_session_id: 'cs_test_ref_1',
      p_payment_intent_id: 'pi_ref_1',
      p_status: 'refunded',
      p_metadata: expect.objectContaining({
        kurs_id: 'kurs-ref-1',
        amount_refunded: 65000,
        reason: 'requested_by_customer',
      }),
    })
  })

  test('charge.refunded returns HTTP 500 when RPC fails', async () => {
    const mockDb = createMockSupabase({
      tables: {
        payments: {
          select: {
            data: {
              id: 'pay-ref-err',
              anmeldung_id: 'anm-ref-err',
              status: 'succeeded',
              stripe_checkout_session_id: 'cs_test_ref_err',
              stripe_payment_intent_id: 'pi_ref_err',
              metadata: {},
            },
          },
        },
      },
      rpcs: {
        process_stripe_payment_update: { data: null, error: { message: 'RPC failure' } },
      },
    })
    setMockSupabaseClients({ admin: mockDb })

    const req = buildSignedWebhookRequest({
      id: 'evt_charge_refunded_err',
      object: 'event',
      type: 'charge.refunded',
      data: {
        object: {
          id: 'ch_ref_err',
          payment_intent: 'pi_ref_err',
          amount_refunded: 50000,
        },
      },
    })

    const res = await stripeWebhookPOST(req)
    expect(res.status).toBe(500)
  })

  test('refund.created ignores non-succeeded refunds and resolves charge -> payment_intent when payment_intent is omitted', async () => {
    const mockDb = createMockSupabase({
      tables: {
        payments: {
          select: {
            data: {
              id: 'pay-from-charge',
              anmeldung_id: 'anm-from-charge',
              status: 'succeeded',
              stripe_checkout_session_id: 'cs_from_charge',
              stripe_payment_intent_id: 'pi_resolved_from_charge',
              metadata: {},
            },
          },
        },
      },
    })
    setMockSupabaseClients({ admin: mockDb })

    // 1. Pending refund should be ignored without touching DB
    const pendingRefundReq = buildSignedWebhookRequest({
      id: 'evt_refund_pending',
      object: 'event',
      type: 'refund.created',
      data: {
        object: {
          id: 're_pending_1',
          object: 'refund',
          status: 'pending',
          payment_intent: 'pi_resolved_from_charge',
          amount: 25000,
        },
      },
    })
    const resPending = await stripeWebhookPOST(pendingRefundReq)
    expect(resPending.status).toBe(200)
    expect(mockDb.calls).toHaveLength(0)

    // 2. Succeeded refund without payment_intent resolves via stripe.charges.retrieve
    const stripe = getStripeServerClient()
    const origChargesRetrieve = stripe.charges.retrieve.bind(stripe.charges)
    stripe.charges.retrieve = (async () =>
      ({
        id: 'ch_lookup_1',
        payment_intent: 'pi_resolved_from_charge',
        invoice: 'in_lookup_1',
      }) as unknown as Stripe.Response<Stripe.Charge>) as typeof stripe.charges.retrieve

    try {
      const succeededRefundReq = buildSignedWebhookRequest({
        id: 'evt_refund_succeeded',
        object: 'event',
        type: 'charge.refund.updated',
        data: {
          object: {
            id: 're_succeeded_1',
            object: 'refund',
            status: 'succeeded',
            payment_intent: null,
            charge: 'ch_lookup_1',
            amount: 25000,
          },
        },
      })
      const resSucceeded = await stripeWebhookPOST(succeededRefundReq)
      expect(resSucceeded.status).toBe(200)

      const rpcCall = mockDb.calls.find(
        (c) => c.kind === 'rpc' && c.target === 'process_stripe_payment_update'
      )
      expect(rpcCall?.payload).toMatchObject({
        p_payment_intent_id: 'pi_resolved_from_charge',
        p_status: 'refunded',
      })
    } finally {
      stripe.charges.retrieve = origChargesRetrieve
    }
  })

  test('credit_note.created ignores non-issued credit notes and processes issued credit notes with out_of_band_amount', async () => {
    const mockDb = createMockSupabase({
      tables: {
        payments: {
          select: {
            data: {
              id: 'pay-cn-1',
              anmeldung_id: 'anm-cn-1',
              status: 'succeeded',
              stripe_checkout_session_id: null,
              stripe_payment_intent_id: 'inv_in_cn_1',
              metadata: { stripe_invoice_id: 'in_cn_1' },
            },
          },
        },
      },
    })
    setMockSupabaseClients({ admin: mockDb })

    // Voided credit note -> ignored
    const voidReq = buildSignedWebhookRequest({
      id: 'evt_cn_void',
      object: 'event',
      type: 'credit_note.updated',
      data: {
        object: {
          id: 'cn_void',
          status: 'void',
          invoice: 'in_cn_1',
          amount: 65000,
        },
      },
    })
    await stripeWebhookPOST(voidReq)
    expect(mockDb.calls).toHaveLength(0)

    // Issued credit note -> triggers refund
    const issuedReq = buildSignedWebhookRequest({
      id: 'evt_cn_issued',
      object: 'event',
      type: 'credit_note.created',
      data: {
        object: {
          id: 'cn_issued_1',
          status: 'issued',
          invoice: 'in_cn_1',
          amount: 65000,
          out_of_band_amount: 65000,
          metadata: { note: 'portal_credit_note' },
        },
      },
    })
    const res = await stripeWebhookPOST(issuedReq)
    expect(res.status).toBe(200)

    const rpcCall = mockDb.calls.find(
      (c) => c.kind === 'rpc' && c.target === 'process_stripe_payment_update'
    )
    expect(rpcCall?.payload).toMatchObject({
      p_payment_intent_id: 'inv_in_cn_1',
      p_status: 'refunded',
      p_metadata: expect.objectContaining({
        credit_note_id: 'cn_issued_1',
        out_of_band_amount: 65000,
        note: 'portal_credit_note',
      }),
    })
  })

  test('invoice.voided and invoice.marked_uncollectible revoke payment access via refundSystemPaymentFromStripe', async () => {
    const mockDb = createMockSupabase({
      tables: {
        payments: {
          select: {
            data: {
              id: 'pay-void-1',
              anmeldung_id: 'anm-void-1',
              status: 'succeeded',
              stripe_checkout_session_id: null,
              stripe_payment_intent_id: 'inv_in_void_1',
              metadata: { stripe_invoice_id: 'in_void_1' },
            },
          },
        },
      },
    })
    setMockSupabaseClients({ admin: mockDb })

    const req = buildSignedWebhookRequest({
      id: 'evt_inv_voided',
      object: 'event',
      type: 'invoice.voided',
      data: {
        object: {
          id: 'in_void_1',
          object: 'invoice',
          metadata: { payment_id: 'pay-void-1' },
        },
      },
    })

    const res = await stripeWebhookPOST(req)
    expect(res.status).toBe(200)

    const rpcCall = mockDb.calls.find(
      (c) => c.kind === 'rpc' && c.target === 'process_stripe_payment_update'
    )
    expect(rpcCall?.payload).toMatchObject({
      p_payment_intent_id: 'inv_in_void_1',
      p_status: 'refunded',
      p_metadata: expect.objectContaining({
        invoice_event: 'invoice.voided',
      }),
    })
  })

  test('acknowledges unhandled Stripe event types safely with HTTP 200 { received: true }', async () => {
    const mockDb = createMockSupabase()
    setMockSupabaseClients({ admin: mockDb })

    const req = buildSignedWebhookRequest({
      id: 'evt_unhandled',
      object: 'event',
      type: 'customer.created',
      data: { object: { id: 'cus_123' } },
    })

    const res = await stripeWebhookPOST(req)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ received: true })
    expect(mockDb.calls).toHaveLength(0)
  })

  test('fulfillSystemPaymentFromStripeInvoice falls back to direct table updates if RPC returns an error and skips unpaid invoices', async () => {
    const mockDb = createMockSupabase({
      tables: {
        payments: {
          select: {
            data: {
              id: 'pay-fallback-1',
              anmeldung_id: 'anm-fallback-1',
              status: 'pending',
              stripe_checkout_session_id: null,
              stripe_payment_intent_id: null,
              metadata: {},
            },
          },
        },
      },
      rpcs: {
        process_stripe_payment_update: { data: null, error: { message: 'rpc failed' } },
      },
    })

    // 1. Unpaid invoice returns false immediately
    const unpaidResult = await fulfillSystemPaymentFromStripeInvoice({
      adminSupabase: mockDb,
      invoice: { id: 'in_open', status: 'open' } as unknown as Stripe.Invoice,
    })
    expect(unpaidResult).toBe(false)

    // 2. Paid invoice with RPC error executes fallback update on payments and intensivwoche_anmeldungen
    const paidResult = await fulfillSystemPaymentFromStripeInvoice({
      adminSupabase: mockDb,
      invoice: {
        id: 'in_paid_fb',
        status: 'paid',
        payment_intent: 'pi_fb_1',
        metadata: { payment_id: 'pay-fallback-1' },
      } as unknown as Stripe.Invoice,
    })
    expect(paidResult).toBe(true)

    const anmeldungUpdate = mockDb.calls.find(
      (c) =>
        c.kind === 'from' &&
        c.target === 'intensivwoche_anmeldungen' &&
        c.operation === 'update'
    )
    expect(anmeldungUpdate?.payload).toMatchObject({ status: 'confirmed' })
  })

  test('refundSystemPaymentFromStripe returns { updated: true } idempotently if already refunded and { updated: false } when unmatched', async () => {
    const alreadyRefundedDb = createMockSupabase({
      tables: {
        payments: {
          select: {
            data: {
              id: 'pay-already-ref',
              anmeldung_id: null,
              status: 'refunded',
              stripe_checkout_session_id: 'cs_1',
              stripe_payment_intent_id: 'pi_already_ref',
              metadata: {},
            },
          },
        },
      },
    })

    const resAlready = await refundSystemPaymentFromStripe({
      adminSupabase: alreadyRefundedDb,
      paymentIntentId: 'pi_already_ref',
    })
    expect(resAlready).toEqual({ updated: true })
    expect(
      alreadyRefundedDb.calls.filter((c) => c.kind === 'rpc')
    ).toHaveLength(0)

    const emptyDb = createMockSupabase({
      tables: {
        payments: { select: { data: null } },
      },
    })
    const resUnmatched = await refundSystemPaymentFromStripe({
      adminSupabase: emptyDb,
      paymentIntentId: null,
      invoiceId: null,
    })
    expect(resUnmatched).toEqual({ updated: false })
  })
})
