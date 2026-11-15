import { test, expect } from '@playwright/test'
import '../helpers/mock-registry'
import {
  resetMocks,
  setMockSession,
  setMockSupabaseClients,
} from '../helpers/mock-registry'
import { createMockSupabase } from '../helpers/mock-supabase'
import Stripe from 'stripe'
import {
  getStripeServerClient,
  getOrCreateStripeCustomer,
  syncSystemPaymentsToStripeInvoices,
  reconcilePendingPaymentsWithStripeInvoices,
  ensureStripeInvoiceForPayment,
} from '@/lib/stripe'
import { GET as verifySessionGET } from '@/app/api/stripe/verify-session/route'
import { POST as createCheckoutSessionPOST } from '@/app/api/stripe/create-checkout-session/route'
import { POST as customerPortalPOST } from '@/app/api/stripe/customer-portal/route'
import { POST as bankTransferPOST } from '@/app/api/payments/bank-transfer/route'
import { GET as bankTransferPdfGET } from '@/app/api/payments/bank-transfer/pdf/route'
import { GET as userThemeGET } from '@/app/api/user/theme/route'

const TEST_STRIPE_SECRET_KEY = 'sk_test_payment_routes_spec_key_1234567890'

test.describe('Payment & Portal Routes Security (`app/api/stripe/*`, `app/api/payments/*`, `lib/stripe.ts`)', () => {
  test.beforeEach(() => {
    resetMocks()
    process.env.STRIPE_SECRET_KEY = TEST_STRIPE_SECRET_KEY
  })

  test.describe('GET /api/stripe/verify-session (3-Gate Verification)', () => {
    test('Gate 1: rejects missing or malformed session_id not starting with cs_test_ or cs_live_ with HTTP 400', async () => {
      const missingRes = await verifySessionGET(
        new Request('http://localhost:3000/api/stripe/verify-session')
      )
      expect(missingRes.status).toBe(400)
      expect((await missingRes.json()).error).toContain('Ungültiges Session-ID Format')

      const invalidPrefixRes = await verifySessionGET(
        new Request('http://localhost:3000/api/stripe/verify-session?session_id=pi_test_12345')
      )
      expect(invalidPrefixRes.status).toBe(400)

      const sqlInjectionRes = await verifySessionGET(
        new Request("http://localhost:3000/api/stripe/verify-session?session_id=' OR 1=1--")
      )
      expect(sqlInjectionRes.status).toBe(400)
    })

    test('Gate 2: returns HTTP 404 when Checkout Session is not found on Stripe', async () => {
      const stripe = getStripeServerClient()
      const origRetrieve = stripe.checkout.sessions.retrieve.bind(stripe.checkout.sessions)
      stripe.checkout.sessions.retrieve = (async () =>
        null as unknown as Stripe.Response<Stripe.Checkout.Session>) as typeof stripe.checkout.sessions.retrieve

      try {
        const res = await verifySessionGET(
          new Request('http://localhost:3000/api/stripe/verify-session?session_id=cs_test_notfound')
        )
        expect(res.status).toBe(404)
      } finally {
        stripe.checkout.sessions.retrieve = origRetrieve
      }
    })

    test('Gate 3: blocks cross-session URL hijacking with HTTP 403 when session does not belong to our payments table', async () => {
      const stripe = getStripeServerClient()
      const origRetrieve = stripe.checkout.sessions.retrieve.bind(stripe.checkout.sessions)
      stripe.checkout.sessions.retrieve = (async () =>
        ({
          id: 'cs_test_foreign_app',
          payment_status: 'paid',
          payment_intent: 'pi_foreign',
        }) as unknown as Stripe.Response<Stripe.Checkout.Session>) as typeof stripe.checkout.sessions.retrieve

      const mockDb = createMockSupabase({
        tables: {
          payments: { select: { data: null } },
        },
      })
      setMockSupabaseClients({ admin: mockDb })

      try {
        const res = await verifySessionGET(
          new Request('http://localhost:3000/api/stripe/verify-session?session_id=cs_test_foreign_app')
        )
        expect(res.status).toBe(403)
        expect((await res.json()).error).toContain('gehört nicht zu dieser Anwendung')
      } finally {
        stripe.checkout.sessions.retrieve = origRetrieve
      }
    })

    test('Strict Gate: rejects unpaid sessions with HTTP 400 without invoking fulfillment RPC', async () => {
      const stripe = getStripeServerClient()
      const origRetrieve = stripe.checkout.sessions.retrieve.bind(stripe.checkout.sessions)
      stripe.checkout.sessions.retrieve = (async () =>
        ({
          id: 'cs_test_unpaid_session',
          payment_status: 'unpaid',
          payment_intent: 'pi_unpaid',
        }) as unknown as Stripe.Response<Stripe.Checkout.Session>) as typeof stripe.checkout.sessions.retrieve

      const mockDb = createMockSupabase({
        tables: {
          payments: {
            select: {
              data: {
                id: 'pay-1',
                status: 'pending',
                amount_rappen: 65000,
                currency: 'chf',
              },
            },
          },
        },
      })
      setMockSupabaseClients({ admin: mockDb })

      try {
        const res = await verifySessionGET(
          new Request('http://localhost:3000/api/stripe/verify-session?session_id=cs_test_unpaid_session')
        )
        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body.success).toBe(false)
        expect(body.status).toBe('unpaid')
        expect(mockDb.calls.filter((c) => c.kind === 'rpc')).toHaveLength(0)
      } finally {
        stripe.checkout.sessions.retrieve = origRetrieve
      }
    })

    test('Paid session passes all 3 gates, invokes process_stripe_payment_update RPC, and returns HTTP 200', async () => {
      const stripe = getStripeServerClient()
      const origRetrieve = stripe.checkout.sessions.retrieve.bind(stripe.checkout.sessions)
      stripe.checkout.sessions.retrieve = (async () =>
        ({
          id: 'cs_live_valid_paid_99',
          payment_status: 'paid',
          payment_intent: 'pi_live_99',
          invoice: 'in_live_99',
          amount_total: 65000,
          currency: 'chf',
          customer_details: { email: 'parent@example.com' },
          metadata: {
            anmeldung_id: 'anm-99',
            beneficiary_user_id: 'child-99',
          },
        }) as unknown as Stripe.Response<Stripe.Checkout.Session>) as typeof stripe.checkout.sessions.retrieve

      const mockDb = createMockSupabase({
        tables: {
          payments: {
            select: {
              data: {
                id: 'pay-99',
                status: 'pending',
                amount_rappen: 65000,
                currency: 'chf',
              },
            },
          },
        },
      })
      setMockSupabaseClients({ admin: mockDb })

      try {
        const res = await verifySessionGET(
          new Request('http://localhost:3000/api/stripe/verify-session?session_id=cs_live_valid_paid_99')
        )
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.status).toBe('succeeded')
        expect(body.payment_status).toBe('paid')
        expect(body.amount_total).toBe(65000)

        const rpcCall = mockDb.calls.find(
          (c) => c.kind === 'rpc' && c.target === 'process_stripe_payment_update'
        )
        expect(rpcCall?.payload).toMatchObject({
          p_checkout_session_id: 'cs_live_valid_paid_99',
          p_payment_intent_id: 'pi_live_99',
          p_status: 'succeeded',
          p_metadata: expect.objectContaining({
            verification_source: 'stripe_api_direct',
            beneficiary_user_id: 'child-99',
            stripe_invoice_id: 'in_live_99',
          }),
        })
      } finally {
        stripe.checkout.sessions.retrieve = origRetrieve
      }
    })
  })

  test.describe('POST /api/stripe/create-checkout-session', () => {
    test('rejects invalid amount_rappen (<= 0 or missing) and missing success_url/cancel_url with HTTP 400', async () => {
      const zeroAmountRes = await createCheckoutSessionPOST(
        new Request('http://localhost:3000/api/stripe/create-checkout-session', {
          method: 'POST',
          body: JSON.stringify({
            amount_rappen: 0,
            success_url: 'http://localhost:3000/ok',
            cancel_url: 'http://localhost:3000/cancel',
          }),
        })
      )
      expect(zeroAmountRes.status).toBe(400)

      const negativeAmountRes = await createCheckoutSessionPOST(
        new Request('http://localhost:3000/api/stripe/create-checkout-session', {
          method: 'POST',
          body: JSON.stringify({
            amount_rappen: -5000,
            success_url: 'http://localhost:3000/ok',
            cancel_url: 'http://localhost:3000/cancel',
          }),
        })
      )
      expect(negativeAmountRes.status).toBe(400)

      const missingUrlsRes = await createCheckoutSessionPOST(
        new Request('http://localhost:3000/api/stripe/create-checkout-session', {
          method: 'POST',
          body: JSON.stringify({
            amount_rappen: 65000,
            success_url: 'http://localhost:3000/ok',
          }),
        })
      )
      expect(missingUrlsRes.status).toBe(400)
    })

    test('blocks double-payment when anmeldung_id or retry_payment_id already has a succeeded payment (HTTP 400)', async () => {
      const mockDbAnmeldungPaid = createMockSupabase({
        tables: {
          payments: {
            select: {
              data: [{ id: 'pay-done', status: 'succeeded', created_at: '2026-01-01T00:00:00Z' }],
            },
          },
        },
      })
      setMockSupabaseClients({ admin: mockDbAnmeldungPaid })

      const res1 = await createCheckoutSessionPOST(
        new Request('http://localhost:3000/api/stripe/create-checkout-session', {
          method: 'POST',
          body: JSON.stringify({
            anmeldung_id: 'anm-paid-1',
            amount_rappen: 65000,
            success_url: 'http://localhost:3000/ok',
            cancel_url: 'http://localhost:3000/cancel',
          }),
        })
      )
      expect(res1.status).toBe(400)
      expect((await res1.json()).error).toContain('bereits erfolgreich bezahlt')

      const mockDbRetryPaid = createMockSupabase({
        tables: {
          payments: {
            select: {
              data: { id: 'pay-retry-done', status: 'succeeded', metadata: {}, user_id: 'u1' },
            },
          },
        },
      })
      setMockSupabaseClients({ admin: mockDbRetryPaid })

      const res2 = await createCheckoutSessionPOST(
        new Request('http://localhost:3000/api/stripe/create-checkout-session', {
          method: 'POST',
          body: JSON.stringify({
            retry_payment_id: 'pay-retry-done',
            amount_rappen: 65000,
            success_url: 'http://localhost:3000/ok',
            cancel_url: 'http://localhost:3000/cancel',
          }),
        })
      )
      expect(res2.status).toBe(400)
      expect((await res2.json()).error).toContain('bereits erfolgreich abgeschlossen')
    })

    test('reuses existing pending/failed payment on retry, enriches metadata from anmeldung, and cancels sibling attempts', async () => {
      const stripe = getStripeServerClient()
      const origCustomersList = stripe.customers.list.bind(stripe.customers)
      const origSessionsCreate = stripe.checkout.sessions.create.bind(stripe.checkout.sessions)

      stripe.customers.list = (async () =>
        ({
          data: [{ id: 'cus_existing_1', metadata: { user_id: 'parent-1' } }],
        }) as unknown as Stripe.ApiListPromise<Stripe.Customer>) as typeof stripe.customers.list

      stripe.checkout.sessions.create = (async () =>
        ({
          id: 'cs_test_retry_new',
          url: 'https://checkout.stripe.com/c/pay/cs_test_retry_new',
        }) as unknown as Stripe.Response<Stripe.Checkout.Session>) as typeof stripe.checkout.sessions.create

      const mockDb = createMockSupabase({
        tables: {
          payments: (call) => {
            if (call.operation === 'select') {
              return {
                data: [
                  {
                    id: 'pay-failed-1',
                    status: 'failed',
                    created_at: '2026-02-01T10:00:00Z',
                    metadata: { initial_tag: 'yes' },
                    user_id: 'parent-1',
                  },
                ],
              }
            }
            if (call.operation === 'update') {
              return { data: { id: 'pay-failed-1' } }
            }
            return { data: null }
          },
          intensivwoche_anmeldungen: {
            select: {
              data: {
                beneficiary_user_id: 'child-1',
                child_firstname: 'Lena',
                child_lastname: 'Muster',
                kurs_id: 42,
                intensivwoche_kurse: { name: 'Herbstkurs Mathematik' },
              },
            },
          },
        },
      })
      setMockSupabaseClients({ admin: mockDb })

      try {
        const res = await createCheckoutSessionPOST(
          new Request('http://localhost:3000/api/stripe/create-checkout-session', {
            method: 'POST',
            body: JSON.stringify({
              anmeldung_id: 'anm-retry-1',
              amount_rappen: 65000,
              customer_email: 'parent@example.com',
              success_url: 'http://localhost:3000/ok',
              cancel_url: 'http://localhost:3000/cancel',
            }),
          })
        )
        expect(res.status).toBe(200)
        const json = await res.json()
        expect(json).toEqual({
          url: 'https://checkout.stripe.com/c/pay/cs_test_retry_new',
          sessionId: 'cs_test_retry_new',
          paymentId: 'pay-failed-1',
        })

        // Verify sibling cancellation was executed
        const cancelCall = mockDb.calls.find(
          (c) =>
            c.kind === 'from' &&
            c.target === 'payments' &&
            c.operation === 'update' &&
            (c.payload as { status?: string })?.status === 'canceled'
        )
        expect(cancelCall).toBeDefined()
      } finally {
        stripe.customers.list = origCustomersList
        stripe.checkout.sessions.create = origSessionsCreate
      }
    })
  })

  test.describe('POST /api/stripe/customer-portal (Access Control & Open-Redirect Protection)', () => {
    test('rejects unauthenticated requests with HTTP 401', async () => {
      setMockSession(null)
      const res = await customerPortalPOST(
        new Request('http://localhost:3000/api/stripe/customer-portal', { method: 'POST' })
      )
      expect(res.status).toBe(401)
    })

    test('blocks child accounts (via session accountType or DB parent_id) with HTTP 403', async () => {
      setMockSession({
        user: {
          id: 'child-user-1',
          email: 'child@zap.local',
          name: 'Kind',
          role: 'user',
          accountType: 'child',
          parentId: 'parent-user-1',
        },
        supabaseAccessToken: 'tok_child',
      })

      const mockDb = createMockSupabase({
        tables: {
          user: {
            select: {
              data: {
                id: 'child-user-1',
                email: 'child@zap.local',
                account_type: 'child',
                parent_id: 'parent-user-1',
              },
            },
          },
        },
      })
      setMockSupabaseClients({ admin: mockDb })

      const res = await customerPortalPOST(
        new Request('http://localhost:3000/api/stripe/customer-portal', { method: 'POST' })
      )
      expect(res.status).toBe(403)
      expect((await res.json()).error).toContain('nur für Elternkonten verfügbar')
    })

    test('rejects accounts without an email address with HTTP 400', async () => {
      setMockSession({
        user: {
          id: 'parent-no-email',
          email: '',
          name: 'Parent',
          role: 'user',
          accountType: 'parent_solo',
        },
        supabaseAccessToken: 'tok_parent',
      })

      const mockDb = createMockSupabase({
        tables: {
          user: {
            select: {
              data: { id: 'parent-no-email', email: null, account_type: 'parent_solo', parent_id: null },
            },
          },
        },
      })
      setMockSupabaseClients({ admin: mockDb })

      const res = await customerPortalPOST(
        new Request('http://localhost:3000/api/stripe/customer-portal', { method: 'POST' })
      )
      expect(res.status).toBe(400)
    })

    test('prevents open-redirect in return_url by enforcing same-origin fallback while allowing same-origin paths', async () => {
      setMockSession({
        user: {
          id: 'parent-1',
          email: 'parent@example.com',
          name: 'Anna Muster',
          role: 'user',
          accountType: 'parent_solo',
        },
        supabaseAccessToken: 'tok_parent',
      })

      const mockDb = createMockSupabase({
        tables: {
          user: {
            select: {
              data: {
                id: 'parent-1',
                email: 'parent@example.com',
                first_name: 'Anna',
                last_name: 'Muster',
                account_type: 'parent',
                parent_id: null,
              },
            },
          },
          payments: { select: { data: [] } },
        },
      })
      setMockSupabaseClients({ admin: mockDb })

      const stripe = getStripeServerClient()
      const origCustomersList = stripe.customers.list.bind(stripe.customers)
      const origPortalCreate = stripe.billingPortal.sessions.create.bind(stripe.billingPortal.sessions)

      let capturedReturnUrl = ''
      stripe.customers.list = (async () =>
        ({
          data: [{ id: 'cus_parent_1', metadata: { user_id: 'parent-1' } }],
        }) as unknown as Stripe.ApiListPromise<Stripe.Customer>) as typeof stripe.customers.list

      stripe.billingPortal.sessions.create = (async (params: Stripe.BillingPortal.SessionCreateParams) => {
        capturedReturnUrl = params.return_url || ''
        return {
          url: 'https://billing.stripe.com/p/session/test_123',
        } as unknown as Stripe.Response<Stripe.BillingPortal.Session>
      }) as typeof stripe.billingPortal.sessions.create

      try {
        // 1. External phishing return_url must be ignored and fall back to http://localhost:3000/profil
        const evilRes = await customerPortalPOST(
          new Request('http://localhost:3000/api/stripe/customer-portal', {
            method: 'POST',
            body: JSON.stringify({ return_url: 'https://evil-phishing.example.com/steal' }),
          })
        )
        expect(evilRes.status).toBe(200)
        expect(capturedReturnUrl).toBe('http://localhost:3000/profil')

        // 2. Same-origin custom path is accepted
        const sameOriginRes = await customerPortalPOST(
          new Request('http://localhost:3000/api/stripe/customer-portal', {
            method: 'POST',
            body: JSON.stringify({ return_url: 'http://localhost:3000/profil?tab=payments' }),
          })
        )
        expect(sameOriginRes.status).toBe(200)
        expect(capturedReturnUrl).toBe('http://localhost:3000/profil?tab=payments')
      } finally {
        stripe.customers.list = origCustomersList
        stripe.billingPortal.sessions.create = origPortalCreate
      }
    })
  })

  test.describe('Bank Transfer & Swiss QR-Bill PDF (`app/api/payments/bank-transfer/*`)', () => {
    test('POST /api/payments/bank-transfer validates amount_rappen, prevents double-payment, and creates pending bank_transfer record', async () => {
      const badAmountRes = await bankTransferPOST(
        new Request('http://localhost:3000/api/payments/bank-transfer', {
          method: 'POST',
          body: JSON.stringify({ amount_rappen: 0 }),
        })
      )
      expect(badAmountRes.status).toBe(400)

      // Already paid check
      const paidDb = createMockSupabase({
        tables: {
          payments: {
            select: {
              data: [{ id: 'pay-already', status: 'succeeded', created_at: '2026-01-01T00:00:00Z' }],
            },
          },
        },
      })
      setMockSupabaseClients({ admin: paidDb })

      const alreadyPaidRes = await bankTransferPOST(
        new Request('http://localhost:3000/api/payments/bank-transfer', {
          method: 'POST',
          body: JSON.stringify({ anmeldung_id: 'anm-paid', amount_rappen: 65000 }),
        })
      )
      expect(alreadyPaidRes.status).toBe(400)

      // Fresh bank-transfer creation
      const freshDb = createMockSupabase({
        tables: {
          payments: (call) => {
            if (call.operation === 'insert') {
              return { data: { id: 'pay-bt-new-1' } }
            }
            return { data: null }
          },
        },
      })
      setMockSupabaseClients({ admin: freshDb })

      const okRes = await bankTransferPOST(
        new Request('http://localhost:3000/api/payments/bank-transfer', {
          method: 'POST',
          body: JSON.stringify({
            anmeldung_id: 'anm-bt-1',
            amount_rappen: 65000,
            user_id: 'parent-1',
          }),
        })
      )
      expect(okRes.status).toBe(200)
      const body = await okRes.json()
      expect(body.paymentId).toBe('pay-bt-new-1')

      const insertCall = freshDb.calls.find(
        (c) => c.kind === 'from' && c.target === 'payments' && c.operation === 'insert'
      )
      expect(insertCall?.payload).toMatchObject({
        amount_rappen: 65000,
        status: 'pending',
        payment_method_types: ['bank_transfer'],
      })
    })

    test('GET /api/payments/bank-transfer/pdf returns 400 when paymentId is missing, 404 when not found, and generates a valid %PDF- binary for valid payment', async () => {
      const missingIdRes = await bankTransferPdfGET(
        new Request('http://localhost:3000/api/payments/bank-transfer/pdf')
      )
      expect(missingIdRes.status).toBe(400)

      const notFoundDb = createMockSupabase({
        tables: {
          payments: { select: { data: null, error: { message: 'not found' } } },
        },
      })
      setMockSupabaseClients({ admin: notFoundDb })

      const notFoundRes = await bankTransferPdfGET(
        new Request('http://localhost:3000/api/payments/bank-transfer/pdf?paymentId=nonexistent')
      )
      expect(notFoundRes.status).toBe(404)

      const validDb = createMockSupabase({
        tables: {
          payments: {
            select: {
              data: {
                id: 'pay-qr-123',
                user_id: 'parent-1',
                amount_rappen: 65000,
                currency: 'chf',
                status: 'pending',
                metadata: { stripe_invoice_id: 'in_already_synced', payer_email: 'parent@example.com' },
              },
            },
          },
          user: {
            select: {
              data: { name: 'Hans Muster' },
            },
          },
        },
      })
      setMockSupabaseClients({ admin: validDb })

      const pdfRes = await bankTransferPdfGET(
        new Request('http://localhost:3000/api/payments/bank-transfer/pdf?paymentId=pay-qr-123')
      )
      expect(pdfRes.status).toBe(200)
      expect(pdfRes.headers.get('Content-Type')).toBe('application/pdf')
      expect(pdfRes.headers.get('Content-Disposition')).toContain('ZAP_Rechnung_pay-qr-123.pdf')

      const arrayBuf = await pdfRes.arrayBuffer()
      const headerAscii = Buffer.from(arrayBuf.slice(0, 5)).toString('ascii')
      expect(headerAscii).toBe('%PDF-')
      expect(arrayBuf.byteLength).toBeGreaterThan(500)
    })
  })

  test.describe('GET /api/user/theme', () => {
    test('returns { theme: "light" } for unauthenticated callers and user theme preference when authenticated', async () => {
      setMockSession(null)
      const anonRes = await userThemeGET()
      expect(await anonRes.json()).toEqual({ theme: 'light' })

      setMockSession({
        user: {
          id: '11111111-2222-3333-4444-555555555555',
          email: 'user@example.com',
          name: 'User',
          role: 'user',
        },
        supabaseAccessToken: 'tok_valid',
      })
      const mockDb = createMockSupabase({
        tables: {
          user: { select: { data: { theme_preference: 'dark' } } },
        },
      })
      setMockSupabaseClients({ authenticated: mockDb })

      const authRes = await userThemeGET()
      expect(await authRes.json()).toEqual({ theme: 'dark' })
    })
  })

  test.describe('Stripe Helper Functions (`lib/stripe.ts`)', () => {
    test('getOrCreateStripeCustomer normalizes email, updates user_id metadata on existing customer, or creates a new customer', async () => {
      const stripe = getStripeServerClient()
      const origList = stripe.customers.list.bind(stripe.customers)
      const origUpdate = stripe.customers.update.bind(stripe.customers)
      const origCreate = stripe.customers.create.bind(stripe.customers)

      let updatedCustomerId: string | null = null
      let createdEmail: string | null = null

      stripe.customers.list = (async (params?: Stripe.CustomerListParams) => {
        if (params?.email === 'existing@example.com') {
          return {
            data: [{ id: 'cus_exist_1', metadata: {} }],
          } as unknown as Stripe.Response<Stripe.ApiList<Stripe.Customer>>
        }
        return { data: [] } as unknown as Stripe.Response<Stripe.ApiList<Stripe.Customer>>
      }) as typeof stripe.customers.list

      stripe.customers.update = (async (id: string) => {
        updatedCustomerId = id
        return { id } as unknown as Stripe.Response<Stripe.Customer>
      }) as typeof stripe.customers.update

      stripe.customers.create = (async (params?: Stripe.CustomerCreateParams) => {
        createdEmail = params?.email ?? null
        return { id: 'cus_created_1' } as unknown as Stripe.Response<Stripe.Customer>
      }) as typeof stripe.customers.create

      try {
        const id1 = await getOrCreateStripeCustomer({
          email: '  EXISTING@Example.com ',
          userId: 'user-123',
        })
        expect(id1).toBe('cus_exist_1')
        expect(updatedCustomerId).toBe('cus_exist_1')

        const id2 = await getOrCreateStripeCustomer({
          email: '  NEWUSER@Example.com ',
          name: 'New User',
          userId: 'user-456',
        })
        expect(id2).toBe('cus_created_1')
        expect(createdEmail).toBe('newuser@example.com')
      } finally {
        stripe.customers.list = origList
        stripe.customers.update = origUpdate
        stripe.customers.create = origCreate
      }
    })

    test('syncSystemPaymentsToStripeInvoices and reconcilePendingPaymentsWithStripeInvoices sync and reconcile invoices accurately', async () => {
      const stripe = getStripeServerClient()
      const origInvoicesList = stripe.invoices.list.bind(stripe.invoices)
      const origInvoicesCreate = stripe.invoices.create.bind(stripe.invoices)
      const origInvoicesFinalize = stripe.invoices.finalizeInvoice.bind(stripe.invoices)
      const origInvoicesPay = stripe.invoices.pay.bind(stripe.invoices)
      const origInvoicesRetrieve = stripe.invoices.retrieve.bind(stripe.invoices)
      const origInvoiceItemsCreate = stripe.invoiceItems.create.bind(stripe.invoiceItems)

      const syncedPairs: Array<{ paymentId: string; invoiceId: string }> = []
      const paidCallbacks: string[] = []

      stripe.invoices.list = (async () =>
        ({
          data: [
            {
              id: 'in_already_paid_in_portal',
              status: 'paid',
              metadata: { payment_id: 'pay-pending-in-db' },
            },
          ],
        }) as unknown as Stripe.ApiListPromise<Stripe.Invoice>) as typeof stripe.invoices.list

      stripe.invoices.create = (async () =>
        ({ id: 'in_draft_new', status: 'draft' }) as unknown as Stripe.Response<Stripe.Invoice>) as typeof stripe.invoices.create

      stripe.invoiceItems.create = (async () =>
        ({ id: 'ii_1' }) as unknown as Stripe.Response<Stripe.InvoiceItem>) as typeof stripe.invoiceItems.create

      stripe.invoices.finalizeInvoice = (async () =>
        ({ id: 'in_draft_new', status: 'open' }) as unknown as Stripe.Response<Stripe.Invoice>) as typeof stripe.invoices.finalizeInvoice

      stripe.invoices.pay = (async () =>
        ({ id: 'in_draft_new', status: 'paid' }) as unknown as Stripe.Response<Stripe.Invoice>) as typeof stripe.invoices.pay

      stripe.invoices.retrieve = (async (id: string) =>
        ({
          id,
          status: 'paid',
          payment_intent: 'pi_reconciled_1',
          metadata: { payment_id: 'pay-pending-in-db' },
        }) as unknown as Stripe.Response<Stripe.Invoice>) as typeof stripe.invoices.retrieve

      try {
        await syncSystemPaymentsToStripeInvoices({
          customerId: 'cus_sync_1',
          userId: 'user-sync-1',
          transactions: [
            {
              id: 'pay-pending-in-db',
              anmeldung_id: 'anm-1',
              user_id: 'user-sync-1',
              stripe_checkout_session_id: null,
              stripe_payment_intent_id: null,
              amount_rappen: 65000,
              currency: 'chf',
              status: 'pending',
              payment_method_types: ['bank_transfer'],
              metadata: {},
              created_at: '2026-02-01T10:00:00Z',
              course_name: 'Intensivwoche',
              beneficiary_name: 'Max Muster',
            },
            {
              id: 'pay-succeeded-new',
              anmeldung_id: 'anm-2',
              user_id: 'user-sync-1',
              stripe_checkout_session_id: null,
              stripe_payment_intent_id: 'pi_2',
              amount_rappen: 45000,
              currency: 'chf',
              status: 'succeeded',
              payment_method_types: ['twint'],
              metadata: {},
              created_at: '2026-02-02T10:00:00Z',
              course_name: 'Auffrischungskurs',
              beneficiary_name: 'Max Muster',
            },
          ],
          onInvoiceSynced: async (paymentId, stripeInvoiceId) => {
            syncedPairs.push({ paymentId, invoiceId: stripeInvoiceId })
          },
          onInvoicePaidInStripe: async (paymentId) => {
            paidCallbacks.push(paymentId)
          },
        })

        expect(paidCallbacks).toEqual(['pay-pending-in-db'])
        expect(syncedPairs).toContainEqual({
          paymentId: 'pay-succeeded-new',
          invoiceId: 'in_draft_new',
        })

        // Test reconcilePendingPaymentsWithStripeInvoices
        const mockDb = createMockSupabase({
          tables: {
            payments: {
              select: {
                data: {
                  id: 'pay-pending-in-db',
                  anmeldung_id: 'anm-1',
                  user_id: 'user-sync-1',
                  amount_rappen: 65000,
                  currency: 'chf',
                  status: 'pending',
                  stripe_checkout_session_id: null,
                  stripe_payment_intent_id: null,
                  metadata: { stripe_invoice_id: 'in_already_paid_in_portal' },
                },
              },
            },
          },
        })

        const reconciled = await reconcilePendingPaymentsWithStripeInvoices({
          adminSupabase: mockDb,
          email: null,
          payments: [
            {
              id: 'pay-pending-in-db',
              anmeldung_id: 'anm-1',
              status: 'pending',
              metadata: { stripe_invoice_id: 'in_already_paid_in_portal' },
            },
          ],
        })
        expect(reconciled).toBe(true)

        // Test ensureStripeInvoiceForPayment returns existing stripe_invoice_id without extra Stripe calls
        const existingInvId = await ensureStripeInvoiceForPayment({
          adminSupabase: mockDb,
          paymentId: 'pay-pending-in-db',
        })
        expect(existingInvId).toBe('in_already_paid_in_portal')
      } finally {
        stripe.invoices.list = origInvoicesList
        stripe.invoices.create = origInvoicesCreate
        stripe.invoices.finalizeInvoice = origInvoicesFinalize
        stripe.invoices.pay = origInvoicesPay
        stripe.invoices.retrieve = origInvoicesRetrieve
        stripe.invoiceItems.create = origInvoiceItemsCreate
      }
    })
  })
})
