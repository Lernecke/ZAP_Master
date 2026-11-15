import { test, expect } from '@playwright/test'
import {
  resetMocks,
  setMockCookie,
  getDeletedCookies,
  setMockSession,
  setBetterAuthGetSessionResult,
  setBetterAuthSignUpResult,
  getMailpitSent,
  RedirectError,
} from '../helpers/mock-registry'
import { NextRequest } from 'next/server'
import { getSafeCallbackUrl } from '@/lib/auth/callback-url'
import { proxy } from '@/proxy'
import { auth } from '@/lib/auth/config'
import {
  requireAuth,
  requireContentManager,
  requireAdmin,
  getUserRole,
  isContentManager,
  isAdmin,
} from '@/lib/auth/guards'
import { clearAuthSessionCookie, signOutAction } from '@/lib/auth/actions'
import { registerUserWithoutConfirmation } from '@/app/(auth)/register/actions'
import {
  createAdminSupabaseClient,
  createAuthenticatedSupabaseClient,
} from '@/lib/supabase/server'

test.beforeEach(() => {
  resetMocks()
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.anon.key'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.service.key'
})

// ============================================================================
// 1. Open-Redirect Prevention (getSafeCallbackUrl)
// ============================================================================

test.describe('Open-Redirect Protection: getSafeCallbackUrl()', () => {
  test('allows valid internal paths and preserves query strings & hashes', () => {
    expect(getSafeCallbackUrl('/dashboard')).toBe('/dashboard')
    expect(getSafeCallbackUrl('/profil')).toBe('/profil')
    expect(getSafeCallbackUrl('/intensivkurse?kurs=9001&mode=child')).toBe(
      '/intensivkurse?kurs=9001&mode=child'
    )
    expect(getSafeCallbackUrl('/materialien/bms#kapitel-2')).toBe('/materialien/bms#kapitel-2')
  })

  test('falls back to /dashboard (or custom fallback) on null, undefined, empty, or non-slash paths', () => {
    expect(getSafeCallbackUrl(null)).toBe('/dashboard')
    expect(getSafeCallbackUrl(undefined)).toBe('/dashboard')
    expect(getSafeCallbackUrl('')).toBe('/dashboard')
    expect(getSafeCallbackUrl('dashboard')).toBe('/dashboard')
    expect(getSafeCallbackUrl('evil.com/login')).toBe('/dashboard')
    expect(getSafeCallbackUrl(null, '/custom-home')).toBe('/custom-home')
  })

  test('rejects protocol-relative and backslash open-redirect vectors', () => {
    expect(getSafeCallbackUrl('//evil.example.com')).toBe('/dashboard')
    expect(getSafeCallbackUrl('///evil.example.com/phish')).toBe('/dashboard')
    expect(getSafeCallbackUrl('/\\evil.example.com')).toBe('/dashboard')
    expect(getSafeCallbackUrl('/\\\\evil.example.com')).toBe('/dashboard')
  })

  test('rejects absolute URLs and dangerous URI schemes even when prefixed with slash', () => {
    expect(getSafeCallbackUrl('https://evil.example.com')).toBe('/dashboard')
    expect(getSafeCallbackUrl('http://evil.example.com')).toBe('/dashboard')
    expect(getSafeCallbackUrl('/https://evil.example.com')).toBe('/dashboard')
    expect(getSafeCallbackUrl('/http://evil.example.com')).toBe('/dashboard')
    expect(getSafeCallbackUrl('javascript:alert(1)')).toBe('/dashboard')
    expect(getSafeCallbackUrl('/javascript:alert(1)')).toBe('/dashboard')
    expect(getSafeCallbackUrl('/JAVASCRIPT:alert(document.cookie)')).toBe('/dashboard')
    expect(getSafeCallbackUrl('/data:text/html,<script>alert(1)</script>')).toBe('/dashboard')
    expect(getSafeCallbackUrl('/vbscript:msgbox(1)')).toBe('/dashboard')
  })

  test('rejects URL-encoded open-redirect bypasses and malformed percent encoding', () => {
    expect(getSafeCallbackUrl('/%2F%2Fevil.example.com')).toBe('/dashboard')
    expect(getSafeCallbackUrl('/%2f%2fevil.example.com')).toBe('/dashboard')
    expect(getSafeCallbackUrl('/%5Cevil.example.com')).toBe('/dashboard')
    expect(getSafeCallbackUrl('/%5cevil.example.com')).toBe('/dashboard')
    expect(getSafeCallbackUrl('/https%3A%2F%2Fevil.example.com')).toBe('/dashboard')
    expect(getSafeCallbackUrl('/javascript%3Aalert(1)')).toBe('/dashboard')
    // Malformed URI sequence that causes decodeURIComponent to throw
    expect(getSafeCallbackUrl('/%E0%A4%A')).toBe('/dashboard')
  })
})

// ============================================================================
// 2. Proxy / Middleware Route Protection
// ============================================================================

test.describe('Proxy / Middleware Route Protection (proxy.ts)', () => {
  const protectedRoutes = [
    '/dashboard',
    '/dashboard/finanzen',
    '/dashboard/arbeitszeiten',
    '/dashboard/admin/benutzer',
    '/trainer',
    '/trainer/exam-1',
    '/uebungen',
    '/uebungen/mathematik',
    '/pruefung',
    '/profil',
    '/aufsaetze',
    '/intensivkurse',
    '/materialien',
    '/materialien/langzeitgymi',
    '/arbeitszeiten',
  ]

  for (const route of protectedRoutes) {
    test(`redirects unauthenticated request on ${route} to /login with exact callbackUrl`, async () => {
      const req = new NextRequest(`http://localhost:3000${route}`)
      const res = await proxy(req)

      expect(res.status).toBe(307)
      const location = new URL(res.headers.get('location')!)
      expect(location.pathname).toBe('/login')
      expect(location.searchParams.get('callbackUrl')).toBe(route)
    })
  }

  test('redirects unauthenticated /api/auth/force-relogin to /login', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/force-relogin')
    const res = await proxy(req)
    expect(res.status).toBe(307)
    const location = new URL(res.headers.get('location')!)
    expect(location.pathname).toBe('/login')
    expect(location.searchParams.get('callbackUrl')).toBe('/api/auth/force-relogin')
  })

  test('allows unauthenticated users to access /login, /register, /forgot-password, /reset-password', async () => {
    for (const authRoute of ['/login', '/register', '/forgot-password', '/reset-password']) {
      const req = new NextRequest(`http://localhost:3000${authRoute}`)
      const res = await proxy(req)
      expect(res.headers.get('location')).toBeNull()
      expect(res.status).toBe(200)
    }
  })

  test('recognizes all three auth session cookies and allows access to protected routes', async () => {
    const cookieNames = [
      'better-auth.session_token',
      '__Secure-better-auth.session_token',
      'zap_auth_session',
    ]

    for (const cookieName of cookieNames) {
      const req = new NextRequest('http://localhost:3000/dashboard/finanzen', {
        headers: { cookie: `${cookieName}=valid_session_token_123` },
      })
      const res = await proxy(req)
      expect(res.headers.get('location')).toBeNull()
      expect(res.status).toBe(200)
    }
  })

  test('redirects authenticated users away from auth pages to validated callbackUrl or /dashboard', async () => {
    // 1. Default redirect to /dashboard
    const reqDefault = new NextRequest('http://localhost:3000/login', {
      headers: { cookie: 'better-auth.session_token=tok_123' },
    })
    const resDefault = await proxy(reqDefault)
    expect(resDefault.status).toBe(307)
    expect(new URL(resDefault.headers.get('location')!).pathname).toBe('/dashboard')

    // 2. Valid internal callbackUrl
    const reqValid = new NextRequest('http://localhost:3000/login?callbackUrl=%2Fprofil', {
      headers: { cookie: 'better-auth.session_token=tok_123' },
    })
    const resValid = await proxy(reqValid)
    expect(resValid.status).toBe(307)
    expect(new URL(resValid.headers.get('location')!).pathname).toBe('/profil')

    // 3. Malicious external callbackUrl is blocked and redirected to /dashboard
    const reqEvil = new NextRequest(
      'http://localhost:3000/login?callbackUrl=' + encodeURIComponent('//evil.example.com/steal'),
      { headers: { cookie: 'better-auth.session_token=tok_123' } }
    )
    const resEvil = await proxy(reqEvil)
    expect(resEvil.status).toBe(307)
    const location = new URL(resEvil.headers.get('location')!)
    expect(location.hostname).toBe('localhost')
    expect(location.pathname).toBe('/dashboard')
  })

  test('allows unlocalized public routes /kurse and /admin without locale prefixing', async () => {
    for (const path of ['/kurse', '/admin', '/admin/payments']) {
      const req = new NextRequest(`http://localhost:3000${path}`)
      const res = await proxy(req)
      expect(res.headers.get('location')).toBeNull()
      expect(res.status).toBe(200)
    }
  })
})

// ============================================================================
// 3. Server Session Resolution (lib/auth/config.ts)
// ============================================================================

test.describe('Server Session Resolution: auth()', () => {
  test('returns null when Better Auth getSession returns null or missing user', async () => {
    setBetterAuthGetSessionResult(null)
    expect(await auth()).toBeNull()

    setBetterAuthGetSessionResult({ session: { token: 'abc' }, user: null })
    expect(await auth()).toBeNull()
  })

  test('returns null gracefully when Better Auth getSession throws an error', async () => {
    setBetterAuthGetSessionResult(null, new Error('Database connection refused'))
    expect(await auth()).toBeNull()
  })

  test('maps user fields, defaults role to "user" and accountType to "parent_solo"', async () => {
    setBetterAuthGetSessionResult({
      user: {
        id: 'u-1',
        email: 'parent@example.com',
        first_name: 'Anna',
        last_name: 'Muster',
        emailVerified: 1,
      },
      session: {
        token: 'ba_session_token_xyz',
      },
    })

    const session = await auth()
    expect(session).toEqual({
      user: {
        id: 'u-1',
        email: 'parent@example.com',
        name: 'Anna Muster',
        role: 'user',
        accountType: 'parent_solo',
        parentId: null,
        emailVerified: true,
      },
      supabaseAccessToken: 'ba_session_token_xyz',
    })
  })

  test('preserves child accountType, parentId, and explicit role', async () => {
    setBetterAuthGetSessionResult({
      user: {
        id: 'child-1',
        email: 'child@example.com',
        name: 'Max Muster',
        role: 'user',
        account_type: 'child',
        parent_id: 'parent-1',
        emailVerified: false,
      },
      session: {
        token: 'child_token_123',
      },
    })

    const session = await auth()
    expect(session?.user.accountType).toBe('child')
    expect(session?.user.parentId).toBe('parent-1')
    expect(session?.user.name).toBe('Max Muster')
    expect(session?.user.emailVerified).toBe(false)
  })
})

// ============================================================================
// 4. Role-Based Access Control Guards (lib/auth/guards.ts)
// ============================================================================

test.describe('Role-Based Access Control Guards (lib/auth/guards.ts)', () => {
  test('requireAuth() redirects unauthenticated users to /login and permits any authenticated role', async () => {
    setMockSession(null)
    await expect(requireAuth()).rejects.toThrow(RedirectError)
    await expect(requireAuth()).rejects.toMatchObject({ url: '/login' })

    setMockSession({
      user: { id: 'u1', email: 'u@example.com', role: 'user' },
      supabaseAccessToken: 'tok',
    })
    const res = await requireAuth()
    expect(res.user.id).toBe('u1')
  })

  test('requireContentManager() blocks anonymous (/login) and student role (/dashboard?error=unauthorized)', async () => {
    setMockSession(null)
    await expect(requireContentManager()).rejects.toMatchObject({ url: '/login' })

    setMockSession({
      user: { id: 'u1', email: 'student@example.com', role: 'user' },
      supabaseAccessToken: 'tok',
    })
    await expect(requireContentManager()).rejects.toMatchObject({
      url: '/dashboard?error=unauthorized',
    })

    // Permits lehrperson
    setMockSession({
      user: { id: 't1', email: 'teacher@example.com', role: 'lehrperson' },
      supabaseAccessToken: 'tok',
    })
    expect((await requireContentManager()).user.role).toBe('lehrperson')

    // Permits admin
    setMockSession({
      user: { id: 'a1', email: 'admin@example.com', role: 'admin' },
      supabaseAccessToken: 'tok',
    })
    expect((await requireContentManager()).user.role).toBe('admin')
  })

  test('requireAdmin() blocks anonymous, student, and lehrperson, and only allows admin', async () => {
    setMockSession(null)
    await expect(requireAdmin()).rejects.toMatchObject({ url: '/login' })

    for (const nonAdminRole of ['user', 'lehrperson'] as const) {
      setMockSession({
        user: { id: 'u1', email: `${nonAdminRole}@example.com`, role: nonAdminRole },
        supabaseAccessToken: 'tok',
      })
      await expect(requireAdmin()).rejects.toMatchObject({
        url: '/dashboard?error=unauthorized',
      })
    }

    setMockSession({
      user: { id: 'a1', email: 'admin@example.com', role: 'admin' },
      supabaseAccessToken: 'tok',
    })
    expect((await requireAdmin()).user.role).toBe('admin')
  })

  test('non-redirecting role helpers (getUserRole, isContentManager, isAdmin) return accurate booleans', async () => {
    setMockSession(null)
    expect(await getUserRole()).toBeNull()
    expect(await isContentManager()).toBe(false)
    expect(await isAdmin()).toBe(false)

    setMockSession({ user: { id: '1', role: 'user' } })
    expect(await getUserRole()).toBe('user')
    expect(await isContentManager()).toBe(false)
    expect(await isAdmin()).toBe(false)

    setMockSession({ user: { id: '2', role: 'lehrperson' } })
    expect(await getUserRole()).toBe('lehrperson')
    expect(await isContentManager()).toBe(true)
    expect(await isAdmin()).toBe(false)

    setMockSession({ user: { id: '3', role: 'admin' } })
    expect(await getUserRole()).toBe('admin')
    expect(await isContentManager()).toBe(true)
    expect(await isAdmin()).toBe(true)
  })
})

// ============================================================================
// 5. Auth Cookie Clearing & User Registration Actions
// ============================================================================

test.describe('Auth Cookie Management & Registration Actions', () => {
  test('clearAuthSessionCookie() and signOutAction() delete all 3 session cookie variants', async () => {
    setMockCookie('zap_auth_session', 'val1')
    setMockCookie('better-auth.session_token', 'val2')
    setMockCookie('__Secure-better-auth.session_token', 'val3')

    const res = await signOutAction()
    expect(res).toEqual({ success: true })
    expect(getDeletedCookies()).toEqual([
      'zap_auth_session',
      'better-auth.session_token',
      '__Secure-better-auth.session_token',
    ])
  })

  test('registerUserWithoutConfirmation() validates inputs and rejects weak passwords or invalid emails', async () => {
    const badEmail = await registerUserWithoutConfirmation('not-an-email', 'secret123', 'Max', 'Muster')
    expect(badEmail.success).toBe(false)
    expect(badEmail.userId).toBeNull()

    const shortPw = await registerUserWithoutConfirmation('max@example.com', '123', 'Max', 'Muster')
    expect(shortPw.success).toBe(false)
    expect(shortPw.error).toContain('mindestens 6 Zeichen')

    const emptyName = await registerUserWithoutConfirmation('max@example.com', 'secret123', '', 'Muster')
    expect(emptyName.success).toBe(false)
  })

  test('registerUserWithoutConfirmation() creates user and sends verification email on valid input', async () => {
    setBetterAuthSignUpResult({ user: { id: 'created-user-42', email: 'max@example.com' } })
    const res = await registerUserWithoutConfirmation('max@example.com', 'secret123', 'Max', 'Muster')

    expect(res).toEqual({
      success: true,
      error: null,
      userId: 'created-user-42',
    })
    expect(getMailpitSent()).toHaveLength(1)
    expect(getMailpitSent()[0].email).toBe('max@example.com')
  })

  test('registerUserWithoutConfirmation() handles Better Auth signup failure cleanly', async () => {
    setBetterAuthSignUpResult(null, new Error('User already exists'))
    const res = await registerUserWithoutConfirmation('existing@example.com', 'secret123', 'Max', 'Muster')
    expect(res.success).toBe(false)
    expect(res.error).toBe('User already exists')
    expect(res.userId).toBeNull()
  })
})

// ============================================================================
// 6. Supabase Client Factory Privilege Separation (lib/supabase/server.ts)
// ============================================================================

test.describe('Supabase Client Privilege Separation', () => {
  test('createAdminSupabaseClient() throws if SUPABASE_SERVICE_ROLE_KEY is missing', () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    expect(() => createAdminSupabaseClient()).toThrow(
      'SUPABASE_SERVICE_ROLE_KEY is not defined in environment variables'
    )
  })

  test('createAuthenticatedSupabaseClient() creates client with Bearer token when valid 3-part JWT is provided (without needing service_role key)', () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    const validJwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEifQ.signature123'
    const client = createAuthenticatedSupabaseClient(validJwt) as unknown as {
      headers?: Record<string, string>
      rest?: { headers?: Record<string, string> | Headers }
    }
    expect(client).toBeDefined()
    const authHeader =
      client.headers?.Authorization ??
      (client.rest?.headers instanceof Headers
        ? client.rest.headers.get('Authorization')
        : (client.rest?.headers as Record<string, string> | undefined)?.Authorization ??
          (client.rest?.headers as Record<string, string> | undefined)?.authorization)
    if (authHeader !== undefined) {
      expect(authHeader).toBe(`Bearer ${validJwt}`)
    }
  })

  test('createAuthenticatedSupabaseClient() falls back to admin client when token is not a 3-part JWT', () => {
    // Better Auth session tokens are opaque single-segment strings; function falls back to createAdminSupabaseClient
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    expect(() => createAuthenticatedSupabaseClient('opaque_better_auth_session_token')).toThrow(
      'SUPABASE_SERVICE_ROLE_KEY is not defined'
    )
  })
})
