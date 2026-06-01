import { BarChart3 } from 'lucide-react'
import { requireAdmin } from '@/lib/auth/guards'

export default async function StatistikenPage() {
  await requireAdmin()

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Statistiken</h1>
          <p className="text-muted-foreground mt-1">
            Nutzungsstatistiken und Analysen
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-12 text-center">
        <BarChart3 className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Kommt bald
        </h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Die Nutzungsstatistiken werden in einem zukünftigen Update verfügbar sein.
          Hier kannst du dann Anmeldezahlen, Lernfortschritte und weitere Analysen einsehen.
        </p>
      </div>
    </div>
  )
}
