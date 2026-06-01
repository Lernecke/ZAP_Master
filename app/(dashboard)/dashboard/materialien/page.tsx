import { Suspense } from 'react'
import Link from 'next/link'
import { Plus, BookOpen } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { Skeleton } from '@/app/components/ui/skeleton'
import { getMaterialien, getSubjects } from './actions'
import { MaterialienTabelle } from '@/app/(dashboard)/dashboard/materialien/materialien-tabelle'
import { requireContentManager } from '@/lib/auth/guards'

export default async function MaterialienAdminPage() {
  // Server-side Rollenprüfung: nur Lehrpersonen und Admins
  await requireContentManager()
  
  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-xl bg-primary/10">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Lernmaterialien verwalten</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Lade Arbeitsblätter, Übungen und andere Lernhilfen hoch
          </p>
        </div>
        <Link href="/dashboard/materialien/neu">
          <Button className="rounded-xl">
            <Plus className="mr-2 h-4 w-4" />
            Neues Material
          </Button>
        </Link>
      </div>

      {/* Materialien-Liste */}
      <Suspense fallback={<MaterialienLoading />}>
        <MaterialienContent />
      </Suspense>
    </div>
  )
}

async function MaterialienContent() {
  const [materialsResult, subjectsResult] = await Promise.all([
    getMaterialien(),
    getSubjects()
  ])

  if (!materialsResult.success) {
    return (
      <div className="rounded-2xl border border-destructive/50 bg-destructive/10 p-6 text-center">
        <p className="text-destructive">{materialsResult.error}</p>
      </div>
    )
  }

  const materials = materialsResult.data || []
  const subjects = subjectsResult.data || []

  if (materials.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-12 text-center">
        <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">Noch keine Materialien</h3>
        <p className="text-muted-foreground mb-6">
          Lade dein erstes Lernmaterial hoch
        </p>
        <Link href="/dashboard/materialien/neu">
          <Button className="rounded-xl">
            <Plus className="mr-2 h-4 w-4" />
            Neues Material hochladen
          </Button>
        </Link>
      </div>
    )
  }

  return <MaterialienTabelle materials={materials} subjects={subjects} />
}

function MaterialienLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-12 w-full rounded-xl" />
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    </div>
  )
}
