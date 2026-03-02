import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { notFound } from 'next/navigation'
import { KursFormular } from '../kurs-formular'
import { getKurs } from '../actions'
import { requireContentManager } from '@/lib/auth/guards'

interface KursBearbeitenPageProps {
  params: Promise<{ id: string }>
}

export default async function KursBearbeitenPage({ params }: KursBearbeitenPageProps) {
  // Server-side Rollenprüfung: nur Lehrpersonen und Admins
  await requireContentManager()
  
  const { id } = await params
  const kursId = parseInt(id, 10)

  if (isNaN(kursId)) {
    notFound()
  }

  const result = await getKurs(kursId)

  if (!result.success || !result.data) {
    notFound()
  }

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
        <h1 className="text-3xl font-bold text-foreground">Kurs bearbeiten</h1>
        <p className="text-muted-foreground mt-1">
          {result.data.name}
        </p>
      </div>

      {/* Formular */}
      <KursFormular kurs={result.data} modus="bearbeiten" />
    </div>
  )
}
