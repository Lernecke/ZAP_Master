import { auth } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import { AufsaetzeClient } from './aufsaetze-client'

export const dynamic = 'force-dynamic'

export default async function AufsaetzePage() {
  const session = await auth()
  
  // Auth-Check
  if (!session?.user?.id || !session.supabaseAccessToken) {
    redirect('/login')
  }
  
  // Nur Schüler (role = 'user') haben Zugang
  if (session.user.role !== 'user') {
    redirect('/dashboard?error=nur-schueler')
  }
  
  return <AufsaetzeClient />
}
