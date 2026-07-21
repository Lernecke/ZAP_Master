import { Suspense } from 'react'
import { auth } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, Lock } from 'lucide-react'
import { Skeleton } from '@/app/components/ui/skeleton'
import { MaterialienListe } from './materialien-liste'
import { MATERIAL_AREA_IDS } from '@/types/kurs-materialien'

// Schritt 11a: Einstieg in die vier geschützten Materialbereiche. Die Zugriffsentscheidung selbst
// fällt ausschliesslich auf /materialien/[area] (Grant-Check + RLS) -- hier nur Navigation, kein
// vorab ausgelesener Grant-Status.
const AREA_LABELS: Record<(typeof MATERIAL_AREA_IDS)[number], string> = {
  langzeitgymi: 'Langzeitgymi',
  kurzgymi: 'Kurzgymi',
  bms: 'BMS',
  matura: 'Matura',
}


export default async function LernmaterialienPage() {
  const session = await auth()

  if (!session?.user?.id || !session.supabaseAccessToken) {
    redirect('/login')
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Statische Shell */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <BookOpen className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Lernmaterialien</h1>
        </div>
        <p className="text-muted-foreground">
          Finde Arbeitsblätter, Übungen und Lernhilfen für deine Prüfungsvorbereitung
        </p>
      </div>

      <div className="mb-8">
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Geschützte Bereiche</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {MATERIAL_AREA_IDS.map((areaId) => (
            <Link
              key={areaId}
              href={`/materialien/${areaId}`}
              className="flex items-center gap-2 rounded-xl border border-border bg-card p-4 hover:border-primary transition-colors"
            >
              <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="font-medium text-foreground">{AREA_LABELS[areaId]}</span>
            </Link>
          ))}
        </div>
      </div>

      <Suspense fallback={<MaterialienSkeleton />}>
        <MaterialienListe token={session.supabaseAccessToken} />
      </Suspense>
    </div>
  )
}

function MaterialienSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Skeleton className="h-10 flex-1 rounded-xl" />
        <Skeleton className="h-10 w-28 rounded-xl" />
      </div>
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-24 rounded-xl" />
      ))}
    </div>
  )
}
