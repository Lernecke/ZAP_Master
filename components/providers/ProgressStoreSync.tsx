'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { useProgressStore } from '@/store/useProgressStore'

/**
 * Hydrates the Zustand progress store from localStorage on mount,
 * injects auth credentials whenever they change, and triggers a
 * DB load once the user is authenticated. Renders nothing.
 * Place next to <AuthStoreSync /> inside <AuthProvider>.
 */
export function ProgressStoreSync() {
  const { userId, supabaseAccessToken } = useAuthStore()
  const setAuthData = useProgressStore((s) => s.setAuthData)
  const loadFromDatabase = useProgressStore((s) => s.loadFromDatabase)

  // Hydrate from localStorage once on mount (client-only)
  useEffect(() => {
    const saved = localStorage.getItem('zap-progress')
    if (saved) {
      try {
        useProgressStore.setState({ answers: JSON.parse(saved) })
      } catch {
        // ignore malformed data
      }
    }
  }, [])

  // Keep auth credentials in sync
  useEffect(() => {
    setAuthData(userId, supabaseAccessToken)
  }, [userId, supabaseAccessToken, setAuthData])

  // Load from DB once credentials are available
  useEffect(() => {
    if (userId && supabaseAccessToken) {
      loadFromDatabase()
    }
  }, [userId, supabaseAccessToken, loadFromDatabase])

  return null
}
