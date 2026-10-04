'use server'

import { createAuthenticatedSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { auth } from '@/lib/auth/config'
import { auth as betterAuth } from '@/lib/auth'
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

  const firstName = data.first_name ?? parsed.data.first_name
  const lastName = data.last_name ?? parsed.data.last_name
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim()

  const { error } = await supabase
    .from('user')
    .update({
      ...data,          // includes class_level, birth_date, gender not covered by schema
      ...parsed.data,   // validated fields overwrite their counterparts
      name: fullName || undefined,
      updatedAt: new Date().toISOString(),
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
    .from('user')
    .update({
      theme_preference: parsed.data.theme,
      updatedAt: new Date().toISOString(),
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
    .from('user')
    .update({
      avatar_url: publicUrl,
      image: publicUrl,
      updatedAt: new Date().toISOString(),
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
    .from('user')
    .update({
      avatar_url: null,
      image: null,
      updatedAt: new Date().toISOString(),
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
    .from('user')
    .select('*')
    .eq('id', session.user.id)
    .single()

  if (error) {
    console.error('Get profile error:', error)
    return null
  }

  return data
}

/**
 * Trigger sending a verification email via Better Auth
 */
export async function sendVerificationEmailAction(): Promise<ProfileResult> {
  const session = await auth()
  if (!session?.user?.email) {
    return { success: false, error: 'Nicht authentifiziert' }
  }

  try {
    await betterAuth.api.sendVerificationEmail({
      body: {
        email: session.user.email,
        callbackURL: '/profil',
      },
    })
    return {
      success: true,
      message: 'Bestätigungs-E-Mail wurde erfolgreich gesendet!',
    }
  } catch (err: unknown) {
    console.error('[BetterAuth] Send verification email error:', err)
    const errorMessage =
      err instanceof Error ? err.message : 'Bestätigungs-E-Mail konnte nicht gesendet werden.'
    return { success: false, error: errorMessage }
  }
}

export interface CourseWithDetails {
  id: string
  status: string
  child_firstname: string
  child_lastname: string
  kurs_id: number | null
  paid_at: string | null
  intensivwoche_kurse: {
    id: number
    name: string
    fach: string
    start_datum: string
    end_datum: string
    uhrzeit?: string | null
    ort?: string | null
    beschreibung?: string | null
  } | null
}

export interface MaterialGrantWithArea {
  id: string
  status: string
  valid_from: string
  valid_until: string | null
  source_kind: string
  material_areas: {
    id: number
    key: string
    label: string
  } | null
}

export interface FamilyMemberOption {
  id: string
  name: string
  first_name: string | null
  last_name: string | null
}

/**
 * Fetch active courses and material access grants for a user or linked child.
 */
export async function getCoursesAndMaterialsAction(targetUserId?: string): Promise<{
  success: boolean
  error?: string
  courses?: CourseWithDetails[]
  materials?: MaterialGrantWithArea[]
  familyMembers?: FamilyMemberOption[]
}> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Nicht authentifiziert' }
  }

  const adminSupabase = createAdminSupabaseClient()
  const effectiveUserId = targetUserId || session.user.id

  // Authorization check: User can only view their own courses or their children's courses (or admin)
  if (effectiveUserId !== session.user.id && session.user.role !== 'admin') {
    const { data: childUser } = await adminSupabase
      .from('user')
      .select('id')
      .eq('id', effectiveUserId)
      .eq('parent_id', session.user.id)
      .maybeSingle()

    if (!childUser) {
      return { success: false, error: 'Keine Berechtigung zum Anzeigen dieser Kurse.' }
    }
  }

  // 1. Fetch active course enrollments for effectiveUserId
  const { data: anmeldungen, error: anmeldungenError } = await adminSupabase
    .from('intensivwoche_anmeldungen')
    .select(`
      id,
      status,
      child_firstname,
      child_lastname,
      kurs_id,
      paid_at,
      intensivwoche_kurse ( id, name, fach, start_datum, end_datum, uhrzeit, ort, beschreibung )
    `)
    .in('status', ['confirmed', 'bezahlt', 'bestaetigt'])
    .eq('beneficiary_user_id', effectiveUserId)
    .order('created_at', { ascending: false })

  if (anmeldungenError) {
    console.error('Error fetching courses:', anmeldungenError)
  }

  // 2. Fetch active material access grants for effectiveUserId
  const { data: grants, error: grantsError } = await adminSupabase
    .from('material_access_grants')
    .select(`
      id,
      status,
      valid_from,
      valid_until,
      source_kind,
      material_areas ( id, key, label )
    `)
    .eq('status', 'active')
    .eq('user_id', effectiveUserId)
    .order('created_at', { ascending: false })

  if (grantsError) {
    console.error('Error fetching material grants:', grantsError)
  }

  // 3. If parent account, fetch linked children options
  let familyMembers: FamilyMemberOption[] = []
  if (session.user.accountType === 'parent_solo' || !session.user.parentId) {
    const { data: children } = await adminSupabase
      .from('user')
      .select('id, name, first_name, last_name')
      .eq('parent_id', session.user.id)
      .order('createdAt', { ascending: true })

    if (children) {
      familyMembers = children.map((c) => ({
        id: c.id,
        name: c.name || [c.first_name, c.last_name].filter(Boolean).join(' ') || 'Kind',
        first_name: c.first_name,
        last_name: c.last_name,
      }))
    }
  }

  return {
    success: true,
    courses: (anmeldungen || []) as unknown as CourseWithDetails[],
    materials: (grants || []) as unknown as MaterialGrantWithArea[],
    familyMembers,
  }
}


