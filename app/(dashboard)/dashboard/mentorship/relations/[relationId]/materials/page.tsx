import { Suspense } from 'react'
import { auth } from '@/lib/auth/config'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getMaterials, getMyRelations } from '../../../actions'
import { MaterialHub } from '../../../components/MaterialHub'
import { Skeleton } from '@/app/components/ui/skeleton'
import { ArrowLeft, FileText } from 'lucide-react'

interface PageProps {
  params: Promise<{ relationId: string }>
}

export const metadata = {
  title: 'Material-Hub | Götti-System | ZAP',
}

async function MaterialsContent({ 
  relationId, 
  currentUserId 
}: { 
  relationId: string
  currentUserId: string 
}) {
  const [materialsResult, relationsResult] = await Promise.all([
    getMaterials(relationId),
    getMyRelations(),
  ])

  // Find this specific relation
  const relations = relationsResult.success ? relationsResult.data ?? [] : []
  const relation = relations.find(r => r.id === relationId)

  if (!relation) {
    notFound()
  }

  const materials = materialsResult.success ? materialsResult.data ?? [] : []
  const isMentor = relation.mentor_id === currentUserId

  return (
    <MaterialHub
      relationId={relationId}
      materials={materials}
      isMentor={isMentor}
    />
  )
}

function MaterialsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-48 rounded-lg" />
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-36 rounded-lg" />
        ))}
      </div>
    </div>
  )
}

export default async function MaterialsPage({ params }: PageProps) {
  const session = await auth()
  
  if (!session?.user) {
    redirect('/login')
  }

  const { relationId } = await params

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6">
      <div className="mb-6">
        <Link
          href="/dashboard/mentorship/relations"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück zu Beziehungen
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <FileText className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Material-Hub
          </h1>
          <p className="text-muted-foreground">
            Lade Materialien hoch und erhalte Feedback
          </p>
        </div>
      </div>

      <Suspense fallback={<MaterialsSkeleton />}>
        <MaterialsContent relationId={relationId} currentUserId={session.user.id} />
      </Suspense>
    </div>
  )
}
