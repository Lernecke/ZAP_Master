import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

/**
 * Standard Supabase Client (für öffentliche Anfragen)
 * Verwendet den anon key und kann nur Daten lesen, die per RLS erlaubt sind
 * ACHTUNG: Ohne Auth-Token ist auth.uid() NULL!
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}

/**
 * Authentifizierter Supabase Client (für User-Anfragen mit RLS)
 * Verwendet den Supabase Access Token aus der NextAuth Session
 * Dies ist die BEST PRACTICE für User-Anfragen!
 */
export function createAuthenticatedSupabaseClient(supabaseAccessToken: string) {
  return createClient<Database>(
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

/**
 * Admin Supabase Client (für authentifizierte Admin-Operationen)
 * Verwendet den Service Role Key und umgeht RLS komplett
 * NUR für serverseitige Admin-Operationen verwenden!
 * Beispiele: User erstellen, Admin-Reports, Batch-Operationen
 */
export function createAdminSupabaseClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined in environment variables')
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
