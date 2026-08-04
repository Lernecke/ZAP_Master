import { createAuthenticatedSupabaseClient } from '@/lib/supabase/server'
import { ProfilClient } from './profil-client'

interface Props {
  userId: string
  token: string
  email: string | null | undefined
  emailVerified: boolean
}

type ThemePreference = 'light' | 'dark' | 'system' | null

function normalizeThemePreference(value: string | null): ThemePreference {
  if (value === 'light' || value === 'dark' || value === 'system') {
    return value
  }

  return null
}

export async function ProfilData({ userId, token, email, emailVerified }: Props) {
  const supabase = createAuthenticatedSupabaseClient(token)

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)

  const profileQuery = isUuid
    ? supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    : email
    ? supabase.from('profiles').select('*').eq('email', email).maybeSingle()
    : Promise.resolve({ data: null, error: null })

  const progressQuery = isUuid
    ? supabase.from('trainer_progress').select('*').eq('user_id', userId)
    : Promise.resolve({ data: null, error: null })

  const [{ data: profile }, { data: progressData }] = await Promise.all([
    profileQuery,
    progressQuery,
  ])

  const completedExams = progressData?.filter((p) => p.completed_at).length || 0
  const totalAttempts = progressData?.length || 0

  const profileData = profile
    ? {
        ...profile,
        email: profile.email || email || null,
        email_verified: emailVerified,
        theme_preference: normalizeThemePreference(profile.theme_preference),
      }
    : {
        id: userId,
        email: email ?? null,
        email_verified: emailVerified,
        first_name: null,
        last_name: null,
        avatar_url: null,
        bio: null,
        school_name: null,
        class_level: null,
        birth_date: null,
        gender: null,
        role: 'user',
        theme_preference: 'light' as const,
        created_at: null,
      }

  return (
    <ProfilClient
      profile={profileData}
      stats={{ totalAttempts, completedExams }}
    />
  )
}
