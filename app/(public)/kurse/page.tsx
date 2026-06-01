import { Suspense } from 'react'
import { Skeleton } from '@/app/components/ui/skeleton'
import { getPublicKurse } from './actions'
import { KurseClient } from './kurse-client'
import { KurseHeader } from './kurse-header'

export default function KursePage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <KurseHeader />
      
      <main className="flex-1 px-6 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Titel */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-3">
              Intensivkurse
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Finde den perfekten Vorbereitungskurs für die ZAP-Prüfung. 
              Kleine Gruppen, erfahrene Lehrkräfte und bewährte Methoden.
            </p>
          </div>

          <Suspense fallback={<KurseLoading />}>
            <KurseContent />
          </Suspense>
        </div>
      </main>
    </div>
  )
}

async function KurseContent() {
  const kurse = await getPublicKurse()
  return <KurseClient initialKurse={kurse} />
}

function KurseLoading() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-72 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
