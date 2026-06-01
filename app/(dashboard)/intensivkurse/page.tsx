
import { Suspense } from 'react'
import { auth } from '@/lib/auth/config'
import { Skeleton } from '@/app/components/ui/skeleton'
import { createAuthenticatedSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { IntensivkurseClient } from './intensivkurse-client'
import type { KursDBMitAnmeldungen } from '@/types/kurs-form'

// Profil-Daten für Vorausfüllung
export interface UserProfileData {
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  class_level: string | null
}

export default async function IntensivkursePage() {
  const session = await auth()
  
  if (!session?.user?.id || !session.supabaseAccessToken) {
    redirect('/login')
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">
          Intensivkurse
        </h1>
        <p className="text-muted-foreground mt-1">
          Finde den perfekten Vorbereitungskurs für die ZAP-Prüfung.
        </p>
      </div>

      <Suspense fallback={<KurseLoading />}>
        <KurseContent userId={session.user.id} supabaseToken={session.supabaseAccessToken} />
      </Suspense>
    </div>
  )
}

async function KurseContent({ userId, supabaseToken }: { userId: string, supabaseToken: string }) {
  const supabase = createAuthenticatedSupabaseClient(supabaseToken)
  
  // Kurse laden (aktive)
  const { data: kurseData } = await supabase
    .from('intensivwoche_kurse')
    .select('*')
    .eq('ist_aktiv', true)
    .order('start_datum', { ascending: true })

  // Anmeldungen separat laden für Count
  const { data: anmeldungenData } = await supabase
    .from('intensivwoche_anmeldungen')
    .select('kurs_id')

  // Count pro Kurs berechnen
  const anmeldungenCountByKurs = (anmeldungenData || []).reduce((acc, a) => {
    if (a.kurs_id !== null) {
      acc[a.kurs_id] = (acc[a.kurs_id] || 0) + 1
    }
    return acc
  }, {} as Record<number, number>)

  // Profil-Daten für Vorausfüllung laden
  const { data: profileData } = await supabase
    .from('profiles')
    .select('first_name, last_name, email, phone, class_level')
    .eq('id', userId)
    .single()

  // Transformiere Kurse für UI
  const kurse: KursDBMitAnmeldungen[] = (kurseData || []).map((kurs) => {
    const anmeldungenCount = anmeldungenCountByKurs[kurs.id] || 0
    const freePlaces = kurs.max_teilnehmer - anmeldungenCount
    
    let status: 'offen' | 'wenige-plaetze' | 'ausgebucht' = 'offen'
    if (freePlaces <= 0) {
      status = 'ausgebucht'
    } else if (freePlaces <= 3) {
      status = 'wenige-plaetze'
    }

    return {
      id: kurs.id,
      name: kurs.name,
      fach: kurs.fach as KursDBMitAnmeldungen['fach'],
      beschreibung: kurs.beschreibung,
      detail_beschreibung: kurs.detail_beschreibung,
      start_datum: kurs.start_datum,
      end_datum: kurs.end_datum,
      uhrzeit: kurs.uhrzeit,
      ort: kurs.ort,
      preis: Number(kurs.preis),
      max_teilnehmer: kurs.max_teilnehmer,
      klassenstufen: kurs.klassenstufen || [],
      lehrer: kurs.lehrer,
      highlights: kurs.highlights || [],
      ist_aktiv: kurs.ist_aktiv,
      created_at: kurs.created_at,
      updated_at: kurs.updated_at,
      created_by: kurs.created_by,
      aktuelle_teilnehmer: anmeldungenCount,
      status,
    }
  })

  const userProfile: UserProfileData = {
    first_name: profileData?.first_name || null,
    last_name: profileData?.last_name || null,
    email: profileData?.email || null,
    phone: profileData?.phone || null,
    class_level: profileData?.class_level || null,
  }

  return <IntensivkurseClient initialKurse={kurse} userProfile={userProfile} />
}

function KurseLoading() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      {/* Cards Skeleton */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-64 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
