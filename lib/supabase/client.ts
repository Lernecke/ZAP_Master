import { createBrowserClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * Standard Browser Client (für öffentliche Anfragen)
 * Verwendet den anon key - RLS policies müssen korrekt konfiguriert sein
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/**
 * Authentifizierter Browser Client (für User-Anfragen mit RLS)
 * Verwendet den Supabase Access Token aus der NextAuth Session
 * BEST PRACTICE für Client-Komponenten mit User-Daten
 */
export function createAuthenticatedBrowserClient(supabaseAccessToken: string) {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${supabaseAccessToken}`,
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
