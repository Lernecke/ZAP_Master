'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useTheme } from 'next-themes'

/**
 * Syncs theme preference from user profile to next-themes
 * Only syncs once when the user logs in or the session changes
 */
export function ThemeSyncProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const { setTheme } = useTheme()

  useEffect(() => {
    // Only sync if we have a session
    if (status === 'authenticated' && session?.user?.id) {
      // Fetch user's theme preference from their profile
      fetchThemePreference(session.user.id).then((theme) => {
        if (theme) {
          setTheme(theme)
        }
      })
    }
  }, [session?.user?.id, status, setTheme])

  return <>{children}</>
}

async function fetchThemePreference(userId: string): Promise<string | null> {
  try {
    const response = await fetch(`/api/user/theme?userId=${userId}`)
    if (response.ok) {
      const data = await response.json()
      return data.theme || 'light'
    }
    return null
  } catch {
    return null
  }
}
