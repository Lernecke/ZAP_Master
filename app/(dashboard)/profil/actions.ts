'use server'

import { createAuthenticatedSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { auth } from '@/lib/auth/config'
import { revalidatePath } from 'next/cache'
import { updateProfileSchema, updateThemeSchema } from '@/types/profil'

export type ProfileResult<T = void> =
  | { success: true; data?: T; message: string }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> }

interface ProfileUpdateData {
  first_name?: string
  last_name?: string
  bio?: string
  school_name?: string
  class_level?: string
  birth_date?: string | null
  gender?: string | null
  theme_preference?: 'light' | 'dark' | 'system'
}

/**
 * Update user profile - verwendet authentifizierten Client mit RLS
 */
export async function updateProfile(data: ProfileUpdateData): Promise<ProfileResult> {
  const session = await auth()
  if (!session?.user?.id || !session.supabaseAccessToken) {
    return { success: false, error: 'Nicht authentifiziert' }
  }

  const parsed = updateProfileSchema.safeParse(data)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Validierungsfehler',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  // Best Practice: Authentifizierter Client mit Supabase Token
  const supabase = createAuthenticatedSupabaseClient(session.supabaseAccessToken)

  const { error } = await supabase
    .from('profiles')
    .update({
      ...data,          // includes class_level, birth_date, gender not covered by schema
      ...parsed.data,   // validated fields overwrite their counterparts
      updated_at: new Date().toISOString(),
    })
    .eq('id', session.user.id)

  if (error) {
    console.error('Profile update error:', error)
    return { success: false, error: 'Profil konnte nicht aktualisiert werden.' }
  }

  revalidatePath('/profil')
  return { success: true, message: 'Profil erfolgreich aktualisiert!' }
}

/**
 * Update theme preference
 */
export async function updateThemePreference(
  theme: 'light' | 'dark' | 'system'
): Promise<ProfileResult> {
  const session = await auth()
  if (!session?.user?.id || !session.supabaseAccessToken) {
    return { success: false, error: 'Nicht authentifiziert' }
  }

  const parsed = updateThemeSchema.safeParse({ theme })
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Ungültiges Theme' }
  }

  const supabase = createAuthenticatedSupabaseClient(session.supabaseAccessToken)

  const { error } = await supabase
    .from('profiles')
    .update({
      theme_preference: parsed.data.theme,
      updated_at: new Date().toISOString(),
    })
    .eq('id', session.user.id)

  if (error) {
    console.error('Theme update error:', error)
    return { success: false, error: 'Theme konnte nicht gespeichert werden.' }
  }

  revalidatePath('/profil')
  return { success: true, message: 'Theme-Einstellung gespeichert!' }
}

/**
 * Upload avatar image
 * Hinweis: Storage-Operationen benötigen Admin-Client wegen Bucket-Policies
 */
export async function uploadAvatar(formData: FormData): Promise<ProfileResult<string>> {
  const session = await auth()
  if (!session?.user?.id || !session.supabaseAccessToken) {
    return { success: false, error: 'Nicht authentifiziert' }
  }

  const file = formData.get('avatar') as File
  if (!file || file.size === 0) {
    return { success: false, error: 'Keine Datei ausgewählt' }
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowedTypes.includes(file.type)) {
    return { success: false, error: 'Nur JPG, PNG, WebP oder GIF erlaubt' }
  }

  // Validate file size (2MB max)
  if (file.size > 2 * 1024 * 1024) {
    return { success: false, error: 'Maximale Dateigrösse ist 2MB' }
  }

  // Storage braucht Admin-Client (oder entsprechende Storage Policies)
  const adminSupabase = createAdminSupabaseClient()
  // Profil-Update mit authentifiziertem Client
  const supabase = createAuthenticatedSupabaseClient(session.supabaseAccessToken)
  
  const userId = session.user.id
  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}/avatar.${fileExt}`

  // Delete old avatar if exists
  await adminSupabase.storage.from('avatars').remove([`${userId}/avatar.jpg`, `${userId}/avatar.png`, `${userId}/avatar.webp`, `${userId}/avatar.gif`])

  // Upload new avatar
  const { error: uploadError } = await adminSupabase.storage
    .from('avatars')
    .upload(fileName, file, {
      upsert: true,
      contentType: file.type,
    })

  if (uploadError) {
    console.error('Upload error:', uploadError)
    return { success: false, error: 'Bild konnte nicht hochgeladen werden.' }
  }

  // Get public URL
  const { data: { publicUrl } } = adminSupabase.storage
    .from('avatars')
    .getPublicUrl(fileName)

  // Update profile with new avatar URL (mit RLS)
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      avatar_url: publicUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  if (updateError) {
    console.error('Profile update error:', updateError)
    return { success: false, error: 'Avatar-URL konnte nicht gespeichert werden.' }
  }

  revalidatePath('/profil')
  return { success: true, data: publicUrl, message: 'Profilbild erfolgreich hochgeladen!' }
}

/**
 * Delete avatar image
 */
export async function deleteAvatar(): Promise<ProfileResult> {
  const session = await auth()
  if (!session?.user?.id || !session.supabaseAccessToken) {
    return { success: false, error: 'Nicht authentifiziert' }
  }

  const adminSupabase = createAdminSupabaseClient()
  const supabase = createAuthenticatedSupabaseClient(session.supabaseAccessToken)
  const userId = session.user.id

  // Delete all possible avatar files (Storage braucht Admin)
  await adminSupabase.storage
    .from('avatars')
    .remove([
      `${userId}/avatar.jpg`,
      `${userId}/avatar.png`,
      `${userId}/avatar.webp`,
      `${userId}/avatar.gif`,
    ])

  // Clear avatar URL in profile (mit RLS)
  const { error } = await supabase
    .from('profiles')
    .update({
      avatar_url: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  if (error) {
    console.error('Profile update error:', error)
    return { success: false, error: 'Avatar konnte nicht entfernt werden.' }
  }

  revalidatePath('/profil')
  return { success: true, message: 'Profilbild entfernt!' }
}

/**
 * Get user profile - verwendet authentifizierten Client mit RLS
 */
export async function getProfile() {
  const session = await auth()
  if (!session?.user?.id || !session.supabaseAccessToken) {
    return null
  }

  const supabase = createAuthenticatedSupabaseClient(session.supabaseAccessToken)
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  if (error) {
    console.error('Get profile error:', error)
    return null
  }

  return data
}
