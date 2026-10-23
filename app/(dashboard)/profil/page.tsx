import { Suspense } from 'react'
import { auth } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import { Skeleton } from '@/app/components/ui/skeleton'
import { ProfilData } from './profil-data'


export default async function ProfilPage() {
  const session = await auth()

  if (!session?.user?.id || !session.supabaseAccessToken) {
    redirect('/login')
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Statische Shell */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Profil</h1>
        <p className="text-muted-foreground mt-1">
          Verwalte deine persönlichen Daten und Einstellungen.
        </p>
      </div>

      <Suspense fallback={<ProfilSkeleton />}>
        <ProfilData
          userId={session.user.id}
          token={session.supabaseAccessToken}
          email={session.user.email}
          emailVerified={session.user.emailVerified ?? false}
        />
      </Suspense>
    </div>
  )
}

function ProfilSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-48 rounded-2xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  )
}
