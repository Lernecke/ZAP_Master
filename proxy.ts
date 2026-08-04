import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import createIntlMiddleware from "next-intl/middleware"
import { routing } from "@/i18n/routing"
import { getSafeCallbackUrl } from "@/lib/auth/callback-url"
import { isMarketingSiteLive, MARKETING_FALLBACK_PATH } from "@/lib/marketing-flag"

const intlMiddleware = createIntlMiddleware(routing)

const protectedPrefixes = [
  "/dashboard",
  "/trainer",
  "/uebungen",
  "/pruefung",
  "/profil",
  "/aufsaetze",
  "/intensivkurse",
  "/materialien",
  "/arbeitszeiten",
]
const authPageRoutes = ["/login", "/register"]
const existingUnlocalizedPublicPrefixes = ["/kurse"]

function isUnderPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

function getSessionTokenFromRequest(request: NextRequest) {
  return (
    request.cookies.get("better-auth.session_token")?.value ||
    request.cookies.get("__Secure-better-auth.session_token")?.value ||
    request.cookies.get("zap_auth_session")?.value
  )
}

async function handleAuthRoute(request: NextRequest) {
  const sessionToken = getSessionTokenFromRequest(request)

  const isAuthPage = request.nextUrl.pathname.startsWith("/login") ||
                     request.nextUrl.pathname.startsWith("/register")

  if (isAuthPage) {
    if (sessionToken) {
      const destination = getSafeCallbackUrl(request.nextUrl.searchParams.get("callbackUrl"))
      return NextResponse.redirect(new URL(destination, request.url))
    }
    return NextResponse.next()
  }

  if (!sessionToken) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    isUnderPrefix(pathname, protectedPrefixes) ||
    authPageRoutes.includes(pathname) ||
    pathname === "/api/auth/force-relogin"
  ) {
    return handleAuthRoute(request)
  }

  if (isUnderPrefix(pathname, existingUnlocalizedPublicPrefixes)) {
    return NextResponse.next()
  }

  if (!isMarketingSiteLive()) {
    return NextResponse.redirect(new URL(MARKETING_FALLBACK_PATH, request.url))
  }

  return intlMiddleware(request)
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/trainer/:path*",
    "/uebungen/:path*",
    "/pruefung/:path*",
    "/profil/:path*",
    "/aufsaetze/:path*",
    "/intensivkurse/:path*",
    "/materialien/:path*",
    "/arbeitszeiten/:path*",
    "/login",
    "/register",
    "/((?!api|_next|.*\\..*).*)",
  ],
}
