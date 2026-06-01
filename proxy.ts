import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function proxy(request: NextRequest) {
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

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/trainer/:path*",
    "/uebungen/:path*",
    "/pruefung/:path*",
    "/profil/:path*",
    "/login",
    "/register",
  ],
}
