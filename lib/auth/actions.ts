'use server'

import { cookies } from "next/headers"

const AUTH_COOKIE_NAME = "zap_auth_session"

export async function clearAuthSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(AUTH_COOKIE_NAME)
  cookieStore.delete("better-auth.session_token")
  cookieStore.delete("__Secure-better-auth.session_token")
}

export async function signOutAction() {
  await clearAuthSessionCookie()
  return { success: true }
}
