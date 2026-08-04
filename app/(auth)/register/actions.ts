'use server'

import { registerSchema } from '@/types/auth'
import { auth } from '@/lib/auth'

/**
 * Registers a new user directly using Better Auth standard tables (user & account)
 * and dispatches a verification email to local Mailpit (localhost:1025 / http://localhost:8025).
 */
export async function registerUserWithoutConfirmation(
  email: string,
  password: string,
  firstName: string,
  lastName: string
): Promise<{ success: boolean; error: string | null; userId: string | null }> {

  const parsed = registerSchema.safeParse({
    email,
    password,
    confirmPassword: password, // Server-side: equality already validated client-side
    firstName,
    lastName,
  })
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Validierungsfehler',
      userId: null,
    }
  }

  try {
    const name = `${parsed.data.firstName} ${parsed.data.lastName}`.trim()
    const res = await auth.api.signUpEmail({
      body: {
        email: parsed.data.email,
        password: parsed.data.password,
        name,
      },
    })

    if (!res || !res.user) {
      return { success: false, error: "Registrierung fehlgeschlagen", userId: null }
    }

    // Explicitly send verification email to local Mailpit (port 1025)
    try {
      await auth.api.sendVerificationEmail({
        body: {
          email: parsed.data.email,
        },
      })
    } catch (mailErr) {
      console.warn("[BetterAuth] Could not send verification email:", mailErr)
    }

    return { success: true, error: null, userId: res.user.id }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Registrierung fehlgeschlagen"
    console.error("[BetterAuth] Registration error:", errorMessage)
    return { success: false, error: errorMessage, userId: null }
  }
}
