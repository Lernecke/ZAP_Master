import { requireContentManager } from '@/lib/auth/guards'
import { getOwnWorkEntries } from './actions'
import { TeacherWorkEntryForm } from '@/app/components/kurse-admin/teacher-work-entry-form'

export default async function ArbeitszeitenPage() {
  // Schritt 10c: eigene Zeiten erfassen/einreichen ist fuer Lehrpersonen (und Admins) gedacht --
  // requireContentManager() deckt beide Rollen ab, RLS beschraenkt danach ohnehin auf eigene Zeilen.
  await requireContentManager()

  const result = await getOwnWorkEntries()
  const entries = result.success && result.data ? result.data : []

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Arbeitszeiten</h1>
        <p className="text-muted-foreground mt-1">Eigene Zeiten erfassen und zur Prüfung einreichen.</p>
      </div>
      <TeacherWorkEntryForm initialEntries={entries} />
    </div>
  )
}
