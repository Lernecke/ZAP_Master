import { headers } from "next/headers"
import { auth as betterAuthInstance } from "@/lib/auth"
import type { UserRole } from "@/types/next-auth"

export interface AppSession {
  user: {
    id: string
    email?: string | null
    name?: string | null
    role: UserRole
  }
  supabaseAccessToken?: string
}

/**
 * Standard Better Auth server session retriever.
 * Retrieves session using Better Auth's official server API `auth.api.getSession`.
 */
export async function auth(): Promise<AppSession | null> {
  try {
    const session = await betterAuthInstance.api.getSession({
      headers: await headers(),
    })

    if (!session || !session.user) {
      return null
    }

    const userRecord = session.user as unknown as Record<string, unknown>
    const role: UserRole = (userRecord.role as UserRole) || "user"

    return {
      user: {
        id: session.user.id,
        email: session.user.email || null,
        name: session.user.name || null,
        role,
      },
      supabaseAccessToken: session.session.token,
    }
  } catch (error) {
    console.error("[BetterAuth] Server session error:", error)
    return null
  }
}
