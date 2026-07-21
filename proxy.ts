import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"
import createIntlMiddleware from "next-intl/middleware"
import { routing } from "@/i18n/routing"

const intlMiddleware = createIntlMiddleware(routing)

// Geschützte (dashboard)-Route-Group. Deckt jetzt auch /aufsaetze, /intensivkurse und
// /materialien ab, die zuvor nur durch den Layout-Guard in app/(dashboard)/layout.tsx
// geschützt waren, nicht durch diesen Proxy-Matcher. /arbeitszeiten (Lehrpersonen-Dashboard,
// Schritt 10c) ist seitdem eine echte Route unter dieser Route-Group.
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

// Bestehende, bewusst unlokalisierte öffentliche Routen, die next-intl nicht mit einem
// Locale-Präfix versehen darf.
const existingUnlocalizedPublicPrefixes = ["/kurse"]

function isUnderPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

async function handleAuthRoute(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET
  })

  const isAuthPage = request.nextUrl.pathname.startsWith("/login") ||
                     request.nextUrl.pathname.startsWith("/register")

  // Spezielle Route um Session zu invalidieren
  if (request.nextUrl.pathname === "/api/auth/force-relogin") {
    return NextResponse.next()
  }

  if (isAuthPage) {
    if (token) {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
    return NextResponse.next()
  }

  if (!token) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Prüfe ob supabaseAccessToken vorhanden ist (nach Security-Update erforderlich)
  // Wenn nicht, muss User sich neu einloggen
  if (!token.supabaseAccessToken) {
    // Redirect zu signout mit relogin Parameter
    const signoutUrl = new URL("/api/auth/signout", request.url)
    signoutUrl.searchParams.set("callbackUrl", "/login?relogin=true")
    return NextResponse.redirect(signoutUrl)
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

  // Bestehende unlokalisierte öffentliche Routen bleiben unverändert an ihrem Ort.
  if (isUnderPrefix(pathname, existingUnlocalizedPublicPrefixes)) {
    return NextResponse.next()
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
