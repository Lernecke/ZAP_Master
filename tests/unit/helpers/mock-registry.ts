import Module from 'node:module'
import type { AppSession } from '@/lib/auth/config'

export class RedirectError extends Error {
  public readonly url: string
  public readonly digest: string

  constructor(url: string) {
    super(`NEXT_REDIRECT:${url}`)
    this.name = 'RedirectError'
    this.url = url
    this.digest = `NEXT_REDIRECT;replace;${url};307;`
  }
}

export interface CookieEntry {
  name: string
  value: string
  options?: Record<string, unknown>
}

interface TestMockState {
  headers: Headers
  cookies: Map<string, CookieEntry>
  deletedCookies: string[]
  revalidatedPaths: Array<{ path: string; type?: string }>
  updatedTags: string[]
  afterCallbacks: Array<() => unknown>
  sessionOverride: AppSession | null | undefined
  betterAuthSessionResult: unknown
  betterAuthSessionError: Error | null
  betterAuthSignUpResult: unknown
  betterAuthSignUpError: Error | null
  betterAuthSendVerificationError: Error | null
  adminSupabaseOverride: unknown
  authenticatedSupabaseOverride: unknown
  serverSupabaseOverride: unknown
  resendSendResult: { data: { id: string } | null; error: { message: string } | null }
  mailpitSent: Array<{ type: 'verification' | 'magic-link' | 'reset-password'; email: string; url: string }>
  mailpitError: Error | null
  anthropicCreateResult: unknown
  anthropicCreateError: Error | null
}

const state: TestMockState = {
  headers: new Headers(),
  cookies: new Map(),
  deletedCookies: [],
  revalidatedPaths: [],
  updatedTags: [],
  afterCallbacks: [],
  sessionOverride: undefined,
  betterAuthSessionResult: null,
  betterAuthSessionError: null,
  betterAuthSignUpResult: { user: { id: 'user-new-123', email: 'new@example.com' } },
  betterAuthSignUpError: null,
  betterAuthSendVerificationError: null,
  adminSupabaseOverride: null,
  authenticatedSupabaseOverride: null,
  serverSupabaseOverride: null,
  resendSendResult: { data: { id: 're_msg_123' }, error: null },
  mailpitSent: [],
  mailpitError: null,
  anthropicCreateResult: {
    content: [{ type: 'text', text: '# Korrekturvorschlag\nSehr gut geschrieben.' }],
    usage: { input_tokens: 120, output_tokens: 240 },
  },
  anthropicCreateError: null,
}

export function resetMocks() {
  state.headers = new Headers()
  state.cookies.clear()
  state.deletedCookies = []
  state.revalidatedPaths = []
  state.updatedTags = []
  state.afterCallbacks = []
  state.sessionOverride = undefined
  state.betterAuthSessionResult = null
  state.betterAuthSessionError = null
  state.betterAuthSignUpResult = { user: { id: 'user-new-123', email: 'new@example.com' } }
  state.betterAuthSignUpError = null
  state.betterAuthSendVerificationError = null
  state.adminSupabaseOverride = null
  state.authenticatedSupabaseOverride = null
  state.serverSupabaseOverride = null
  state.resendSendResult = { data: { id: 're_msg_123' }, error: null }
  state.mailpitSent = []
  state.mailpitError = null
  state.anthropicCreateResult = {
    content: [{ type: 'text', text: '# Korrekturvorschlag\nSehr gut geschrieben.' }],
    usage: { input_tokens: 120, output_tokens: 240 },
  }
  state.anthropicCreateError = null
}

export function setMockHeaders(init: Record<string, string> | Headers) {
  state.headers = new Headers(init)
}

export function setMockCookie(name: string, value: string, options?: Record<string, unknown>) {
  state.cookies.set(name, { name, value, options })
}

export function getMockCookies() {
  return state.cookies
}

export function getDeletedCookies() {
  return state.deletedCookies
}

export function getRevalidatedPaths() {
  return state.revalidatedPaths
}

export function getUpdatedTags() {
  return state.updatedTags
}

export function getAfterCallbacks() {
  return state.afterCallbacks
}

export async function flushAfterCallbacks() {
  const callbacks = [...state.afterCallbacks]
  state.afterCallbacks = []
  for (const cb of callbacks) {
    await cb()
  }
}

export function setMockSession(session: AppSession | null | undefined) {
  state.sessionOverride = session
}

export function setBetterAuthGetSessionResult(result: unknown, error: Error | null = null) {
  state.sessionOverride = undefined
  state.betterAuthSessionResult = result
  state.betterAuthSessionError = error
}

export function setBetterAuthSignUpResult(result: unknown, error: Error | null = null) {
  state.betterAuthSignUpResult = result
  state.betterAuthSignUpError = error
}

export function setMockSupabaseClients(clients: {
  admin?: unknown
  authenticated?: unknown
  server?: unknown
}) {
  if (clients.admin !== undefined) state.adminSupabaseOverride = clients.admin
  if (clients.authenticated !== undefined) state.authenticatedSupabaseOverride = clients.authenticated
  if (clients.server !== undefined) state.serverSupabaseOverride = clients.server
}

export function setMockResendResult(result: {
  data: { id: string } | null
  error: { message: string } | null
}) {
  state.resendSendResult = result
}

export function getMailpitSent() {
  return state.mailpitSent
}

export function setMailpitError(err: Error | null) {
  state.mailpitError = err
}

export function setMockAnthropicResult(result: unknown, error: Error | null = null) {
  state.anthropicCreateResult = result
  state.anthropicCreateError = error
}

// Install Module._load interceptor once
const originalLoad = (Module as unknown as { _load: (request: string, parent: unknown, isMain: boolean) => unknown })._load
let installed = false

export function installModuleMocks() {
  if (installed) return
  installed = true

  ;(Module as unknown as { _load: (request: string, parent: unknown, isMain: boolean) => unknown })._load = function (
    request: string,
    parent: unknown,
    isMain: boolean
  ) {
    if (
      request === 'next/headers' ||
      request.endsWith('/next/headers') ||
      request.endsWith('/next/headers.js')
    ) {
      return {
        headers: async () => state.headers,
        cookies: async () => ({
          get: (name: string) => state.cookies.get(name),
          getAll: () => Array.from(state.cookies.values()),
          has: (name: string) => state.cookies.has(name),
          set: (name: string, value: string, options?: Record<string, unknown>) => {
            state.cookies.set(name, { name, value, options })
          },
          delete: (name: string) => {
            state.deletedCookies.push(name)
            state.cookies.delete(name)
          },
        }),
      }
    }

    if (
      request === 'next/navigation' ||
      request.endsWith('/next/navigation') ||
      request.endsWith('/next/navigation.js')
    ) {
      return {
        redirect: (url: string): never => {
          throw new RedirectError(url)
        },
        notFound: (): never => {
          throw new Error('NEXT_NOT_FOUND')
        },
        useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {} }),
        usePathname: () => '/',
        useSearchParams: () => new URLSearchParams(),
      }
    }

    if (
      request === 'next/cache' ||
      request.endsWith('/next/cache') ||
      request.endsWith('/next/cache.js')
    ) {
      return {
        revalidatePath: (path: string, type?: string) => {
          state.revalidatedPaths.push({ path, type })
        },
        revalidateTag: (tag: string) => {
          state.updatedTags.push(tag)
        },
        updateTag: (tag: string) => {
          state.updatedTags.push(tag)
        },
        unstable_cache: <T extends (...args: unknown[]) => unknown>(fn: T) => fn,
        cacheTag: () => {},
        cacheLife: () => {},
      }
    }

    if (
      request === 'next/server' ||
      request.endsWith('/next/server') ||
      request.endsWith('/next/server.js')
    ) {
      const resolvedNextServer = require.resolve('next/server.js')
      const actualNextServer = originalLoad.apply(this, [resolvedNextServer, parent, isMain]) as Record<string, unknown>
      return {
        ...actualNextServer,
        after: (cb: () => unknown) => {
          state.afterCallbacks.push(cb)
        },
      }
    }

    if (request === 'next-intl/middleware') {
      const resolvedNextServer = require.resolve('next/server.js')
      const { NextResponse } = originalLoad.apply(this, [resolvedNextServer, parent, isMain]) as {
        NextResponse: {
          next: () => unknown
          redirect: (url: URL, status?: number) => unknown
        }
      }
      const createIntlMiddleware = (routingConfig?: { locales?: readonly string[]; defaultLocale?: string }) => {
        const locales = routingConfig?.locales ?? ['de']
        const defaultLocale = routingConfig?.defaultLocale ?? 'de'
        return (req: { nextUrl: { pathname: string }; url: string }) => {
          const { pathname } = req.nextUrl
          const hasLocale = locales.some(
            (loc) => pathname === `/${loc}` || pathname.startsWith(`/${loc}/`)
          )
          if (hasLocale) {
            return NextResponse.next()
          }
          const target = pathname === '/' ? `/${defaultLocale}` : `/${defaultLocale}${pathname}`
          return NextResponse.redirect(new URL(target, req.url), 307)
        }
      }
      return {
        __esModule: true,
        default: createIntlMiddleware,
      }
    }

    if (request === 'next-intl/routing') {
      return {
        defineRouting: <T>(cfg: T) => cfg,
      }
    }

    if (request === '@/lib/auth' || request.endsWith('/lib/auth')) {
      return {
        auth: {
          handler: async () => new Response('ok'),
          api: {
            getSession: async () => {
              if (state.betterAuthSessionError) {
                throw state.betterAuthSessionError
              }
              if (state.sessionOverride !== undefined) {
                if (state.sessionOverride === null) return null
                return {
                  user: {
                    id: state.sessionOverride.user.id,
                    email: state.sessionOverride.user.email,
                    name: state.sessionOverride.user.name,
                    role: state.sessionOverride.user.role,
                    accountType: state.sessionOverride.user.accountType,
                    parentId: state.sessionOverride.user.parentId,
                    emailVerified: state.sessionOverride.user.emailVerified ?? true,
                  },
                  session: {
                    token: state.sessionOverride.supabaseAccessToken ?? 'session_tok_default',
                  },
                }
              }
              return state.betterAuthSessionResult
            },
            signUpEmail: async () => {
              if (state.betterAuthSignUpError) {
                throw state.betterAuthSignUpError
              }
              return state.betterAuthSignUpResult
            },
            sendVerificationEmail: async ({ body }: { body: { email: string; callbackURL?: string } }) => {
              if (state.betterAuthSendVerificationError) {
                throw state.betterAuthSendVerificationError
              }
              state.mailpitSent.push({
                type: 'verification',
                email: body.email,
                url: body.callbackURL || 'http://localhost:3000/verify',
              })
              return { status: true }
            },
          },
        },
      }
    }

    if (request === '@/lib/mail/mailpit-client' || request.endsWith('/lib/mail/mailpit-client')) {
      return {
        sendVerificationEmailMailpit: async ({ email, url }: { email: string; url: string }) => {
          if (state.mailpitError) throw state.mailpitError
          state.mailpitSent.push({ type: 'verification', email, url })
        },
        sendMagicLinkEmailMailpit: async ({ email, url }: { email: string; url: string }) => {
          if (state.mailpitError) throw state.mailpitError
          state.mailpitSent.push({ type: 'magic-link', email, url })
        },
        sendResetPasswordEmailMailpit: async ({ email, url }: { email: string; url: string }) => {
          if (state.mailpitError) throw state.mailpitError
          state.mailpitSent.push({ type: 'reset-password', email, url })
        },
      }
    }

    if (request === '@/lib/mail/resend-client' || request.endsWith('/lib/mail/resend-client')) {
      return {
        getMailFromAddress: () => 'ZAP <noreply@zap.example.test>',
        getResendClient: () => ({
          emails: {
            send: async () => state.resendSendResult,
          },
        }),
      }
    }

    if (request === '@/lib/ai/client' || request.endsWith('/lib/ai/client')) {
      return {
        AI_MODEL: 'claude-sonnet-4-20250514',
        AI_MAX_TOKENS: 4096,
        anthropic: {
          messages: {
            create: async () => {
              if (state.anthropicCreateError) throw state.anthropicCreateError
              return state.anthropicCreateResult
            },
          },
        },
      }
    }

    if (request === '@/lib/supabase/server' || request.endsWith('/lib/supabase/server')) {
      const actualSupabaseServer = originalLoad.apply(this, [request, parent, isMain]) as {
        createServerSupabaseClient: () => Promise<unknown>
        createAuthenticatedSupabaseClient: (token?: string) => unknown
        createAdminSupabaseClient: () => unknown
      }
      return {
        createServerSupabaseClient: async () => {
          if (state.serverSupabaseOverride) return state.serverSupabaseOverride
          return actualSupabaseServer.createServerSupabaseClient()
        },
        createAuthenticatedSupabaseClient: (token?: string) => {
          if (state.authenticatedSupabaseOverride) return state.authenticatedSupabaseOverride
          return actualSupabaseServer.createAuthenticatedSupabaseClient(token)
        },
        createAdminSupabaseClient: () => {
          if (state.adminSupabaseOverride) return state.adminSupabaseOverride
          return actualSupabaseServer.createAdminSupabaseClient()
        },
      }
    }

    return originalLoad.apply(this, [request, parent, isMain])
  }
}

installModuleMocks()
