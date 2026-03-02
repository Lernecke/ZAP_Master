import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
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
    <div className="rounded-2xl border border-border bg-card p-12 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
      <p className="text-muted-foreground mt-4">Kurse werden geladen...</p>
    </div>
  )
}
