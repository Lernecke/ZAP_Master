import { Settings, Save } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { requireAdmin } from '@/lib/auth/guards'

export default async function EinstellungenPage() {
  await requireAdmin()
  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Einstellungen</h1>
          <p className="text-muted-foreground mt-1">
            Systemeinstellungen und Konfiguration
          </p>
        </div>
        <Button className="rounded-xl" disabled>
          <Save className="mr-2 h-4 w-4" />
          Speichern
        </Button>
      </div>

      {/* Coming Soon */}
      <div className="rounded-2xl border border-border bg-card p-12 text-center">
        <Settings className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Kommt bald
        </h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Die Systemeinstellungen werden in einem zukünftigen Update verfügbar sein.
          Hier kannst du dann E-Mail-Vorlagen, Benachrichtigungen und weitere Optionen konfigurieren.
        </p>
      </div>
    </div>
  )
}
