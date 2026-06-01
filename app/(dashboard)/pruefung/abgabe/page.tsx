import { Suspense } from 'react'
import { auth } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import { Skeleton } from '@/app/components/ui/skeleton'
import { ResultsData } from './results-data'

export default async function ResultsPage() {
  const session = await auth()

  if (!session?.user?.id || !session.supabaseAccessToken) {
    redirect('/login')
  }

  return (
    <div className="space-y-8">
      <Suspense fallback={<ResultsSkeleton />}>
        <ResultsData
          userId={session.user.id}
          token={session.supabaseAccessToken}
        />
      </Suspense>
    </div>
  )
}

function ResultsSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="rounded-2xl h-64" />
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
