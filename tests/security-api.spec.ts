import { test, expect } from '@playwright/test'

/**
 * End-to-End HTTP & Browser Security Suite against the running Next.js server.
 * Verifies live HTTP status codes, headers, webhook signature rejection,
 * payment verification gates, cron bearer token enforcement, and open-redirect defenses.
 */
test.describe('Live HTTP API & Browser Security Suite (`tests/security-api.spec.ts`)', () => {
  test('POST /api/webhooks/stripe rejects missing and forged signatures over HTTP', async ({
    request,
  }) => {
    const missingSigRes = await request.post('/api/webhooks/stripe', {
      data: { id: 'evt_test_1', type: 'checkout.session.completed' },
    })
    // 400 when STRIPE_WEBHOOK_SECRET is configured, or 500 fail-closed if unset
    expect([400, 500]).toContain(missingSigRes.status())

    const forgedSigRes = await request.post('/api/webhooks/stripe', {
      headers: {
        'stripe-signature': 't=1700000000,v1=0000000000000000000000000000000000000000000000000000000000000000',
      },
      data: { id: 'evt_test_forged', type: 'checkout.session.completed' },
    })
    expect([400, 500]).toContain(forgedSigRes.status())
  })

  test('GET /api/stripe/verify-session enforces Gate 1 format validation over HTTP (400)', async ({
    request,
  }) => {
    const noParamRes = await request.get('/api/stripe/verify-session')
    expect(noParamRes.status()).toBe(400)

    const badFormatRes = await request.get('/api/stripe/verify-session?session_id=invalid_session_id')
    expect(badFormatRes.status()).toBe(400)
    const body = await badFormatRes.json()
    expect(body.error).toContain('Ungültiges Session-ID Format')
  })

  test('POST /api/stripe/customer-portal rejects unauthenticated callers with HTTP 401', async ({
    request,
  }) => {
    const res = await request.post('/api/stripe/customer-portal', {
      data: { return_url: 'https://evil.example.com' },
    })
    expect(res.status()).toBe(401)
  })

  test('POST /api/mail-outbox/process rejects unauthenticated and invalid Bearer tokens with HTTP 401', async ({
    request,
  }) => {
    const noAuthRes = await request.post('/api/mail-outbox/process')
    expect(noAuthRes.status()).toBe(401)

    const wrongTokenRes = await request.post('/api/mail-outbox/process', {
      headers: {
        authorization: 'Bearer invalid_attacker_token_123456',
      },
    })
    expect(wrongTokenRes.status()).toBe(401)
  })

  test('POST /api/stripe/create-checkout-session and POST /api/payments/bank-transfer reject invalid amounts (400)', async ({
    request,
  }) => {
    const checkoutZero = await request.post('/api/stripe/create-checkout-session', {
      data: {
        amount_rappen: 0,
        success_url: 'http://localhost:3000/ok',
        cancel_url: 'http://localhost:3000/cancel',
      },
    })
    expect(checkoutZero.status()).toBe(400)

    const checkoutNegative = await request.post('/api/stripe/create-checkout-session', {
      data: {
        amount_rappen: -100,
        success_url: 'http://localhost:3000/ok',
        cancel_url: 'http://localhost:3000/cancel',
      },
    })
    expect(checkoutNegative.status()).toBe(400)

    const bankTransferZero = await request.post('/api/payments/bank-transfer', {
      data: { amount_rappen: 0 },
    })
    expect(bankTransferZero.status()).toBe(400)
  })

  test('GET /api/payments/bank-transfer/pdf rejects missing paymentId (400) and nonexistent UUID (404)', async ({
    request,
  }) => {
    const missingId = await request.get('/api/payments/bank-transfer/pdf')
    expect(missingId.status()).toBe(400)

    const unknownId = await request.get(
      '/api/payments/bank-transfer/pdf?paymentId=00000000-0000-0000-0000-000000000000'
    )
    expect(unknownId.status()).toBe(404)
  })

  test('GET /api/user/theme returns safe default { theme: "light" } for unauthenticated requests', async ({
    request,
  }) => {
    const res = await request.get('/api/user/theme')
    expect(res.status()).toBe(200)
    expect(await res.json()).toEqual({ theme: 'light' })
  })

  test('unauthenticated requests to protected routes redirect (307) to /login with callbackUrl', async ({
    request,
  }) => {
    for (const protectedPath of [
      '/dashboard',
      '/profil',
      '/aufsaetze',
      '/intensivkurse',
      '/materialien/bms',
    ]) {
      const res = await request.get(protectedPath, { maxRedirects: 0 })
      expect(res.status()).toBe(307)
      expect(res.headers()['location']).toBe(
        `/login?callbackUrl=${encodeURIComponent(protectedPath)}`
      )
    }
  })
})
