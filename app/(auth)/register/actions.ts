'use server'

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * TEMPORÄR: Erstellt einen User ohne E-Mail-Bestätigung
 * NUR FÜR ENTWICKLUNG - In Produktion E-Mail-Bestätigung aktivieren!
 */
export async function registerUserWithoutConfirmation(
  email: string,
  password: string,
  firstName: string,
  lastName: string
): Promise<{ success: boolean; error: string | null; userId: string | null }> {
  
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  // User mit Admin API erstellen (umgeht E-Mail-Bestätigung)
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Direkt bestätigt!
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
    },
  })

  if (error) {
    return { success: false, error: error.message, userId: null }
  }

  const userId = data.user?.id

  // Profil in profiles Tabelle erstellen
  if (userId) {
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: email,
        first_name: firstName,
        last_name: lastName,
        role: 'user',
        theme_preference: 'light',
      }, {
        onConflict: 'id'
      })

    if (profileError) {
      console.error('Error creating profile:', profileError)
      // User wurde erstellt, aber Profil nicht - nicht kritisch
    }
  }

  return { success: true, error: null, userId: userId || null }
}
