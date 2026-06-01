'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useAuthStore } from '@/store/useAuthStore'

/**
 * Syncs the NextAuth session into the Zustand auth store once on mount
 * and whenever the session changes. Renders nothing.
 * Place this as a direct child of <AuthProvider> in the root layout.
 */
export function AuthStoreSync() {
  const { data: session, status } = useSession()
  const setSession = useAuthStore((s) => s.setSession)

  useEffect(() => {
    // Don't overwrite the 'loading' initial state while NextAuth is still resolving
    if (status === 'loading') return
    setSession(session)
  }, [session, status, setSession])

  return null
}
