import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { KursFormular } from '../kurs-formular'
import { requireContentManager } from '@/lib/auth/guards'

export default async function NeuerKursPage() {
  // Server-side Rollenprüfung: nur Lehrpersonen und Admins
  await requireContentManager()
  
  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <Link 
          href="/dashboard/kurse"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zur Übersicht
        </Link>
        <h1 className="text-3xl font-bold text-foreground">Neuen Kurs erstellen</h1>
        <p className="text-muted-foreground mt-1">
          Fülle das Formular aus, um einen neuen Intensivwoche-Kurs anzulegen.
        </p>
      </div>

      {/* Formular */}
      <KursFormular modus="erstellen" />
    </div>
  )
}
