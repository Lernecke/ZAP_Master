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
    
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(session.user.id)
    
    let query = supabase.from('user').select('theme_preference')
    if (session.user.id) {
      query = query.eq('id', session.user.id)
    } else if (session.user.email) {
      query = query.eq('email', session.user.email)
    } else {
      return NextResponse.json({ theme: 'light' })
    }

    const { data, error } = await query.maybeSingle()

    if (error) {
      console.error('Theme fetch error:', error)
      return NextResponse.json({ theme: 'light' })
    }

    return NextResponse.json({ theme: data?.theme_preference || 'light' })
  } catch {
    return NextResponse.json({ theme: 'light' })
  }
}
