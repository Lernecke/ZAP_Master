import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireAdmin } from '@/lib/auth/guards'
import { CourseForm } from '../course-form'

export default async function NeuerAuffrischungskursPage() {
  await requireAdmin()

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <Link
          href="/dashboard/kurse/auffrischungskurse"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zur Übersicht
        </Link>
        <h1 className="text-3xl font-bold text-foreground">Neuen Kurs erstellen</h1>
        <p className="text-muted-foreground mt-1">Auffrischungs- oder Intensivkurs anlegen.</p>
      </div>

      <CourseForm modus="erstellen" />
    </div>
  )
}
