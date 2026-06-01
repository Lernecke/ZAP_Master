import { Suspense } from 'react'
import { auth } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import { Skeleton } from '@/app/components/ui/skeleton'
import { AufsaetzeClient } from './aufsaetze-client'



export default async function AufsaetzePage() {
  const session = await auth()

  if (!session?.user?.id || !session.supabaseAccessToken) {
    redirect('/login')
  }

  if (session.user.role !== 'user') {
    redirect('/dashboard?error=nur-schueler')
  }

  return (
    <div className="p-6 lg:p-8">
      <Suspense fallback={<AufsaetzeSkeleton />}>
        <AufsaetzeClient />
      </Suspense>
    </div>
  )
}

function AufsaetzeSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-24 rounded-2xl" />
      ))}
    </div>
  )
}
