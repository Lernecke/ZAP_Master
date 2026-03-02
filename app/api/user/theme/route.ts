import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { createAuthenticatedSupabaseClient } from '@/lib/supabase/server'

export async function GET() {
  const session = await auth()

  if (!session?.user?.id || !session.supabaseAccessToken) {
    return NextResponse.json({ theme: 'light' })
  }

  try {
    const supabase = createAuthenticatedSupabaseClient(session.supabaseAccessToken)
    
    const { data, error } = await supabase
      .from('profiles')
      .select('theme_preference')
      .eq('id', session.user.id)
      .single()

    if (error) {
      console.error('Theme fetch error:', error)
      return NextResponse.json({ theme: 'light' })
    }

    return NextResponse.json({ theme: data?.theme_preference || 'light' })
  } catch {
    return NextResponse.json({ theme: 'light' })
  }
}
