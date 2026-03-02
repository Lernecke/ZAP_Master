import { auth } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import { AufsaetzeVerwaltungClient } from './aufsaetze-verwaltung-client'

export const dynamic = 'force-dynamic'

export default async function AufsaetzeVerwaltungPage() {
  const session = await auth()
  
  // Auth-Check
  if (!session?.user?.id || !session.supabaseAccessToken) {
    redirect('/login')
  }
  
  // Nur Lehrpersonen und Admins
  if (session.user.role !== 'lehrperson' && session.user.role !== 'admin') {
    redirect('/dashboard?error=unauthorized')
  }
  
  return <AufsaetzeVerwaltungClient />
}
