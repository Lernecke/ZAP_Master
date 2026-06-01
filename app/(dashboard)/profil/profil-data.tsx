import { createAuthenticatedSupabaseClient } from '@/lib/supabase/server'
import { ProfilClient } from './profil-client'

interface Props {
  userId: string
  token: string
  email: string | null | undefined
}

export async function ProfilData({ userId, token, email }: Props) {
  const supabase = createAuthenticatedSupabaseClient(token)

  const [{ data: profile }, { data: progressData }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('trainer_progress').select('*').eq('user_id', userId),
  ])

  const completedExams = progressData?.filter((p) => p.completed_at).length || 0
  const totalAttempts = progressData?.length || 0

  const profileData = profile || {
    id: userId,
    email: email ?? null,
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
