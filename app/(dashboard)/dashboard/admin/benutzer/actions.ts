'use server'

import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/auth/guards'
import { revalidatePath } from 'next/cache'
import type { UserRole } from '@/types/next-auth'
import type { Database } from '@/types/database'
import { updateUserRoleSchema } from '@/types/admin'

// Admin Client direkt erstellen (umgeht RLS)
function getAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

export type UserWithProfile = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  role: UserRole
  created_at: string | null
  avatar_url: string | null
}

/**
 * Alle Benutzer mit Profilen laden
 */
export async function getUsers(): Promise<{ users: UserWithProfile[], error: string | null }> {
  await requireAdmin()
  
  const supabase = getAdminClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name, role, created_at, avatar_url')
    .order('created_at', { ascending: false })
  
  if (error) {
    return { users: [], error: error.message }
  }
  
  const users: UserWithProfile[] = (data || []).map((u) => ({
    id: u.id,
    email: u.email || '',
    first_name: u.first_name,
    last_name: u.last_name,
    role: (u.role as UserRole) || 'user',
    created_at: u.created_at,
    avatar_url: u.avatar_url,
  }))
  
  return { users, error: null }
}

/**
 * Benutzer-Rolle ändern
 */
export async function updateUserRole(
  userId: string,
  newRole: UserRole
): Promise<{ success: boolean; error: string | null; fieldErrors?: Record<string, string[]> }> {
  const session = await requireAdmin()

  const parsed = updateUserRoleSchema.safeParse({ userId, newRole })
  if (!parsed.success) {
    return {
      success: false,
      error: 'Validierungsfehler',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  // Verhindere, dass Admin sich selbst degradiert
  if (parsed.data.userId === session.user.id && parsed.data.newRole !== 'admin') {
    return { success: false, error: 'Du kannst deine eigene Admin-Rolle nicht entfernen.' }
  }
  
  const supabase = getAdminClient()

  const { error } = await supabase
    .from('profiles')
    .update({ role: parsed.data.newRole, updated_at: new Date().toISOString() })
    .eq('id', parsed.data.userId)
  
  if (error) {
    return { success: false, error: error.message }
  }
  
  revalidatePath('/dashboard/admin/benutzer')
  return { success: true, error: null }
}

/**
 * Benutzer löschen (nur Admin)
 */
export async function deleteUser(
  userId: string
): Promise<{ success: boolean, error: string | null }> {
  const session = await requireAdmin()
  
  // Verhindere Selbstlöschung
  if (session.user.id === userId) {
    return { success: false, error: 'Du kannst dich nicht selbst löschen.' }
  }
  
  const supabase = getAdminClient()
  
  // Lösche zuerst das Profil (FK constraint)
  const { error: profileError } = await supabase
    .from('profiles')
    .delete()
    .eq('id', userId)
  
  if (profileError) {
    return { success: false, error: profileError.message }
  }
  
  // auth.users kann nur via Admin API gelöscht werden
  // Das Profil ist gelöscht, der Auth-Eintrag bleibt (orphaned)
  // In Produktion: Supabase Admin API verwenden
  
  revalidatePath('/dashboard/admin/benutzer')
  return { success: true, error: null }
}
