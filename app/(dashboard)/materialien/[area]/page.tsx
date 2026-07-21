import { redirect, notFound } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { BookOpen, Lock } from 'lucide-react'
import { isMaterialAreaId } from '@/types/kurs-materialien'
import { checkMaterialAreaAccess, getAreaMaterials, listAreaGrants } from './actions'
import { MaterialienAreaClient } from './materialien-area-client'
import { MaterialAccessAdminPanel } from './material-access-admin-panel'

// Schritt 11a (Abschnitt 2.11 des Architektur-Briefings): geschützte Materialbereichsseite.
// Zugriffsentscheidung ist ausschliesslich serverseitig/RLS-gestützt (checkMaterialAreaAccess),
// niemals ein Clientfilter oder ein versteckter Tab.

export default async function MaterialienAreaPage({ params }: { params: Promise<{ area: string }> }) {
  const { area: areaParam } = await params

  if (!isMaterialAreaId(areaParam)) {
    notFound()
  }

  const session = await auth()
  if (!session?.user || !session.supabaseAccessToken) {
    redirect(`/login?callbackUrl=/materialien/${areaParam}`)
  }

  const accessResult = await checkMaterialAreaAccess(areaParam)
  if (!accessResult.success || !accessResult.data) {
    return (
      <div className="p-6 lg:p-8">
        <div className="rounded-2xl border border-destructive/50 bg-destructive/10 p-6 text-center text-destructive">
          {!accessResult.success ? accessResult.error : 'Zugriff konnte nicht geprüft werden.'}
        </div>
      </div>
    )
  }

  const { allowed, isAdmin, area } = accessResult.data

  if (!allowed) {
    return (
      <div className="p-6 lg:p-8">
        <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-8 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
            <Lock className="h-6 w-6 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">Kein Zugang</h1>
          <p className="text-muted-foreground">
            Für den Bereich „{area.label}“ liegt aktuell keine aktive Freigabe für dein Konto vor. Falls du dich
            für das Selbststudium in diesem Bereich eingeschrieben hast, wende dich bitte an das Team.
          </p>
        </div>
      </div>
    )
  }

  const materialsResult = await getAreaMaterials(areaParam)
  const grantsResult = isAdmin ? await listAreaGrants(areaParam) : null

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10">
          <BookOpen className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">{area.label}</h1>
          <p className="text-muted-foreground">Geschützte Materialien für diesen Bereich</p>
        </div>
      </div>

      {isAdmin && grantsResult?.success && grantsResult.data && (
        <MaterialAccessAdminPanel areaId={areaParam} initialGrants={grantsResult.data} />
      )}

      {materialsResult.success ? (
        <MaterialienAreaClient materials={materialsResult.data ?? []} />
      ) : (
        <div className="rounded-2xl border border-destructive/50 bg-destructive/10 p-6 text-center text-destructive">
          {materialsResult.error}
        </div>
      )}
    </div>
  )
}
