import { Suspense } from 'react'
import Link from 'next/link'
import { 
  Plus, 
  GraduationCap,
  Loader2
} from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { getKurse } from './actions'
import { KurseTabelle } from './kurse-tabelle'
import { requireContentManager } from '@/lib/auth/guards'

export default async function KurseAdminPage() {
  // Server-side Rollenprüfung: nur Lehrpersonen und Admins
  await requireContentManager()
  
  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Kursverwaltung</h1>
          <p className="text-muted-foreground mt-1">
            Erstelle und verwalte Intensivwoche-Kurse
          </p>
        </div>
        <Link href="/dashboard/kurse/neu">
          <Button className="rounded-xl">
            <Plus className="mr-2 h-4 w-4" />
            Neuer Kurs
          </Button>
        </Link>
      </div>

      {/* Kurse-Liste */}
      <Suspense fallback={<KurseLoading />}>
        <KurseContent />
      </Suspense>
    </div>
  )
}

async function KurseContent() {
  const result = await getKurse()

  if (!result.success) {
    return (
      <div className="rounded-2xl border border-destructive/50 bg-destructive/10 p-6 text-center">
        <p className="text-destructive">{result.error}</p>
      </div>
    )
  }

  const kurse = result.data || []

  if (kurse.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-12 text-center">
        <GraduationCap className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Noch keine Kurse vorhanden
        </h3>
        <p className="text-muted-foreground mb-6">
          Erstelle deinen ersten Intensivwoche-Kurs.
        </p>
        <Link href="/dashboard/kurse/neu">
          <Button className="rounded-xl">
            <Plus className="mr-2 h-4 w-4" />
            Ersten Kurs erstellen
          </Button>
        </Link>
      </div>
    )
  }

  return <KurseTabelle kurse={kurse} />
}

function KurseLoading() {
  return (
    <div className="rounded-2xl border border-border bg-card p-12 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
      <p className="text-muted-foreground mt-4">Kurse werden geladen...</p>
    </div>
  )
}
