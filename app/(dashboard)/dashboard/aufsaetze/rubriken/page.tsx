import { auth } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import { RubrikenClient } from './rubriken-client'


export default async function RubrikenPage() {
  const session = await auth()

  if (!session?.user?.id || !session.supabaseAccessToken) {
    redirect('/login')
  }

  if (session.user.role !== 'lehrperson' && session.user.role !== 'admin') {
    redirect('/dashboard?error=keine-berechtigung')
  }

  return <RubrikenClient />
}
