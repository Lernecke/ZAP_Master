import { Suspense } from 'react'
import { auth } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getMyRelations } from '../actions'
import { RelationsList } from '../components/RelationsList'
import { Skeleton } from '@/app/components/ui/skeleton'
import { ArrowLeft, Users } from 'lucide-react'

export const metadata = {
  title: 'Meine Götti-Beziehungen | ZAP',
}

async function RelationsContent({ currentUserId }: { currentUserId: string }) {
  const result = await getMyRelations()
  const relations = result.success ? result.data ?? [] : []

  return <RelationsList relations={relations} currentUserId={currentUserId} />
}

function RelationsSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-48 rounded-lg" />
      ))}
    </div>
  )
}

export default async function RelationsPage() {
  const session = await auth()
  
  if (!session?.user) {
    redirect('/login')
  }

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6">
      <div className="mb-6">
        <Link
          href="/dashboard/mentorship"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück zum Marktplatz
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <Users className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Meine Götti-Beziehungen
          </h1>
          <p className="text-muted-foreground">
            Verwalte deine aktiven Mentor-Mentee Verbindungen
          </p>
        </div>
      </div>

      <Suspense fallback={<RelationsSkeleton />}>
        <RelationsContent currentUserId={session.user.id} />
      </Suspense>
    </div>
  )
}
