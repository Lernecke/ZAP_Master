import { auth } from '@/lib/auth/config'
import { createAuthenticatedSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfilClient } from './profil-client'

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ProfilPage() {
  const session = await auth()
  
  if (!session?.user?.id || !session.supabaseAccessToken) {
    redirect('/login')
  }

  // Verwende authentifizierten Client mit Supabase Access Token (Best Practice!)
  // So funktioniert auth.uid() in RLS Policies korrekt
  const supabase = createAuthenticatedSupabaseClient(session.supabaseAccessToken)

  // Fetch profile data
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  // Fetch progress stats
  const { data: progressData } = await supabase
    .from('trainer_progress')
    .select('*')
    .eq('user_id', session.user.id)

  const completedExams = progressData?.filter((p) => p.completed_at).length || 0
  const totalAttempts = progressData?.length || 0

  // Provide default profile if not found
  const profileData = profile || {
    id: session.user.id,
    email: session.user.email ?? null,
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
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Profil</h1>
        <p className="text-muted-foreground mt-1">
          Verwalte deine persönlichen Daten und Einstellungen.
        </p>
      </div>

      <ProfilClient
        profile={profileData}
        stats={{
          totalAttempts,
          completedExams,
        }}
      />
    </div>
  )
}
