import { Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { auth } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import { Skeleton } from '@/app/components/ui/skeleton'
import { PruefungsButtons } from './pruefungs-buttons'


export default async function PruefungPage() {
  const session = await auth()

  if (!session?.user?.id || !session.supabaseAccessToken) {
    redirect('/login')
  }

  return (
    <div className="space-y-8">
      {/* Statische Shell: Hero-Bild */}
      <div className="relative w-full h-[300px] md:h-[400px] rounded-2xl overflow-hidden">
        <Image
          src="/pruefung.webp"
          alt="Prüfung"
          fill={true}
          style={{ objectFit: 'cover', objectPosition: 'center' }}
          className="rounded-2xl"
          priority
        />
        <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg">
            Prüfung
          </h1>
        </div>
      </div>

      {/* Statische Shell: Beschreibung + Infos */}
      <div className="bg-card rounded-2xl p-6 md:p-8 shadow-sm border border-border">
        <p className="text-lg leading-relaxed mb-6 text-muted-foreground">
          Mache dich bereit, deine Fähigkeiten auf die Probe zu stellen! In dieser
          Prüfung werden deine Kenntnisse und dein Verständnis der wichtigsten
          mathematischen Konzepte bewertet, so dass du deinen Lernfortschritt messen
          kannst. Ziel ist es, dein Können unter Zeitdruck auf Probe zu stellen. Am
          Ende der Prüfung erhältst du eine Rückmeldung, wie gut deine Antworten waren.
        </p>

        <div className="bg-primary/10 rounded-xl p-4 mb-8">
          <p className="font-semibold text-foreground text-lg">Mathematikprüfung</p>
          <p className="text-muted-foreground">Dauer: Eine Stunde</p>
        </div>

        {/* Dynamisch: Buttons je nach vorherigen Antworten */}
        <Suspense fallback={<PruefungsButtonsSkeleton />}>
          <PruefungsButtons
            userId={session.user.id}
            token={session.supabaseAccessToken}
          />
        </Suspense>
      </div>

      {/* Statische Shell: Hinweis-Box */}
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-6">
        <h3 className="font-semibold text-yellow-700 dark:text-yellow-400 mb-2">💡 Hinweis</h3>
        <p className="text-yellow-700 dark:text-yellow-400/80">
          Diese Prüfung simuliert eine echte ZAP-Mathematikprüfung. Für zusätzliche
          Übungen mit KI-generierten Aufgaben, besuche den{' '}
          <Link href="/trainer" className="underline hover:text-yellow-800 dark:hover:text-yellow-300">
            KI-Trainer
          </Link>.
        </p>
      </div>
    </div>
  )
}

function PruefungsButtonsSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <Skeleton className="h-12 w-48 rounded-xl" />
    </div>
  )
}
