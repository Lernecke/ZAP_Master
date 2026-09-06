'use client'

import { useEffect } from 'react'
import { useSession } from '@/lib/auth-client'
import { useAuthStore } from '@/store/useAuthStore'
import type { Session, UserRole } from '@/types/next-auth'

/**
 * Syncs the Better Auth session into the Zustand auth store once on mount
 * and whenever the session changes. Renders nothing.
 * Place this as a direct child of <AuthProvider> in the root layout.
 */
export function AuthStoreSync() {
  const { data: session, isPending } = useSession()
  const setSession = useAuthStore((s) => s.setSession)

  useEffect(() => {
    if (isPending) return
    if (session) {
      const userRecord = session.user as unknown as Record<string, unknown>
      const sessionRecord = session as unknown as Record<string, unknown>

      const firstName = (userRecord.firstName || userRecord.first_name) as string | undefined
      const lastName = (userRecord.lastName || userRecord.last_name) as string | undefined
      const computedName = [firstName, lastName].filter(Boolean).join(' ').trim() || session.user.name || null

      const mappedSession: Session = {
        user: {
          id: session.user.id,
          email: session.user.email,
          name: computedName,
          role: (userRecord.role as UserRole) || 'user',
        },
        supabaseAccessToken: typeof sessionRecord.supabaseAccessToken === 'string' ? sessionRecord.supabaseAccessToken : undefined,
      }
      setSession(mappedSession)
    } else {
      setSession(null)
    }
  }, [session, isPending, setSession])

  return null
}
