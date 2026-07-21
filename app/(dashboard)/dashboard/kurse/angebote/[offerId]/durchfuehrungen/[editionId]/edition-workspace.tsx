'use client'

// Schritt 10a: orchestriert OfferEditionForm/SessionEditor/EditionPreview/PublicationChecklist
// (Abschnitt 3 des Architektur-Briefings) und den "Bearbeitungskontext"-Block aus Layout_Admin_
// Kursangebot_Maske.html. Ein Kontextwechsel (anderes Angebot/andere Durchführung) navigiert
// vollständig neu -- das erfüllt "Beim Kontextwechsel werden alle Felder aus der neuen Edition
// geladen" ohne einen zweiten, parallelen Client-State-Baum pflegen zu müssen.

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { OfferEditionForm } from '@/app/components/kurse-admin/offer-edition-form'
import { SessionEditor } from '@/app/components/kurse-admin/session-editor'
import { EditionPreview } from '@/app/components/kurse-admin/edition-preview'
import { PublicationChecklist } from '@/app/components/kurse-admin/publication-checklist'
import { duplicateEditionAction, type AdminOfferListEntry } from '@/app/(dashboard)/dashboard/kurse/durchfuehrungen/actions'
import type { OfferEditionDB, OfferEditionFormInput, CourseSessionWithKursDB } from '@/types/kurs-edition'
import { getAudienceDisplayLabel, KURSTYP_LABELS } from '@/lib/kurse/offer-admin-catalog'

export function EditionWorkspace({
  offerList,
  offerId,
  catalogEntry,
  editions,
  edition,
  editionIdParam,
  sessions,
}: {
  offerList: AdminOfferListEntry[]
  offerId: number
  catalogEntry: AdminOfferListEntry
  editions: OfferEditionDB[]
  edition: OfferEditionDB | null
  editionIdParam: string
  sessions: CourseSessionWithKursDB[]
}) {
  const router = useRouter()
  const [liveValues, setLiveValues] = useState<OfferEditionFormInput | null>(null)
  const [showDuplicate, setShowDuplicate] = useState(false)
  const [duplicateYear, setDuplicateYear] = useState('')
  const [duplicateState, setDuplicateState] = useState<'idle' | 'saving' | 'error'>('idle')
  const [duplicateError, setDuplicateError] = useState('')

  const handleValuesChange = useCallback((values: OfferEditionFormInput) => setLiveValues(values), [])

  const handleEditionSaved = (saved: OfferEditionDB) => {
    if (editionIdParam === 'neu') {
      router.replace(`/dashboard/kurse/angebote/${offerId}/durchfuehrungen/${saved.id}`)
    } else {
      router.refresh()
    }
  }

  const handleDuplicate = async () => {
    if (!edition || !duplicateYear.trim()) return
    setDuplicateState('saving')
    setDuplicateError('')
    const result = await duplicateEditionAction(offerId, edition.id, duplicateYear.trim())
    if (result.success && result.data) {
      setDuplicateState('idle')
      setShowDuplicate(false)
      router.push(`/dashboard/kurse/angebote/${offerId}/durchfuehrungen/${result.data.id}`)
    } else if (!result.success) {
      setDuplicateState('error')
      setDuplicateError(result.error)
    }
  }

  const activeSessionCount = sessions.filter((s) => s.registration_status === 'bookable').length
  const statusLabel =
    edition?.status === 'published' ? 'Veröffentlicht · öffentlich' : edition?.status === 'archived' ? 'Archiviert' : 'Entwurf · nicht öffentlich'

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link href="/dashboard/kurse/angebote" className="text-sm text-muted-foreground hover:text-foreground">
            ← Kursangebote
          </Link>
          <h1 className="text-2xl font-bold text-foreground mt-1">Kursangebot verwalten</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Alle Kursangebote, Preise, Termine und Veröffentlichungen an einem Ort bearbeiten.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {edition && catalogEntry.kurstyp !== 'selbststudium' && (
            <Link href={`/dashboard/kurse/angebote/${offerId}/durchfuehrungen/${edition.id}/tagesfreigaben`}>
              <Button variant="outline" size="sm">
                Tagesfreigaben
              </Button>
            </Link>
          )}
          <Badge variant={edition?.status === 'published' ? 'default' : 'secondary'}>{statusLabel}</Badge>
        </div>
      </div>

      {/* Bearbeitungskontext */}
      <section className="rounded-2xl border border-border bg-card p-5 grid grid-cols-1 md:grid-cols-[1.3fr_1fr_auto] gap-4 items-end">
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5">Kursangebot</label>
          <select
            className="w-full h-11 px-3 rounded-xl border border-border bg-background text-sm"
            value={offerId}
            onChange={(event) => router.push(`/dashboard/kurse/angebote/${event.target.value}/durchfuehrungen/neu`)}
          >
            {offerList.map((entry) => (
              <option key={entry.offerId} value={entry.offerId}>
                {entry.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5">Durchführung</label>
          <select
            className="w-full h-11 px-3 rounded-xl border border-border bg-background text-sm"
            value={editionIdParam}
            onChange={(event) => router.push(`/dashboard/kurse/angebote/${offerId}/durchfuehrungen/${event.target.value}`)}
          >
            {editions.map((e) => (
              <option key={e.id} value={e.id}>
                {e.school_year} {e.status === 'archived' ? '(archiviert)' : ''}
              </option>
            ))}
            <option value="neu">Neue Durchführung …</option>
          </select>
        </div>
        <Button type="button" variant="outline" disabled={!edition} onClick={() => setShowDuplicate((v) => !v)}>
          Vorjahr duplizieren
        </Button>
        {showDuplicate && (
          <div className="md:col-span-3 flex flex-wrap items-end gap-3 pt-2 border-t border-border">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Neues Schuljahr</label>
              <input
                type="text"
                placeholder="z.B. 2027/28"
                value={duplicateYear}
                onChange={(event) => setDuplicateYear(event.target.value)}
                className="h-10 px-3 rounded-lg border border-border bg-background text-sm"
              />
            </div>
            <Button type="button" size="sm" onClick={handleDuplicate} disabled={duplicateState === 'saving' || !duplicateYear.trim()}>
              Duplizieren
            </Button>
            {duplicateError && <p className="text-xs text-destructive">{duplicateError}</p>}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_330px] gap-5 items-start">
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="identity-card grid grid-cols-1 md:grid-cols-2 gap-3 p-4 border border-border rounded-xl bg-muted/30">
              <div>
                <span className="block font-mono text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Zielgruppe</span>
                <strong className="text-sm">{getAudienceDisplayLabel(catalogEntry.audienceId)}</strong>
              </div>
              <div>
                <span className="block font-mono text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Angebotstyp</span>
                <strong className="text-sm">{KURSTYP_LABELS[catalogEntry.kurstyp]}</strong>
              </div>
              <p className="md:col-span-2 pt-2 border-t border-border text-xs text-muted-foreground">
                Diese Stammdaten werden aus dem oben gewählten Kursangebot abgeleitet und hier nicht doppelt bearbeitet.
              </p>
            </div>
          </div>

          <OfferEditionForm offerId={offerId} edition={edition} onValuesChange={handleValuesChange} onSaved={handleEditionSaved} />

          {catalogEntry.kurstyp !== 'selbststudium' && (
            <SessionEditor offerId={offerId} edition={edition} sessions={sessions} />
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6">
          <EditionPreview catalogEntry={catalogEntry} liveValues={liveValues} activeSessionCount={activeSessionCount} />
          <PublicationChecklist
            liveValues={liveValues}
            kurstyp={catalogEntry.kurstyp}
            activeSessionCount={activeSessionCount}
            isPublished={edition?.status === 'published'}
          />
          <section className="rounded-2xl bg-primary text-primary-foreground p-5">
            <h3 className="text-base font-semibold">Änderungen erscheinen auf</h3>
            <p className="text-xs opacity-80 mt-1">Eine zentrale Durchführung aktualisiert alle Verbraucher des gewählten Angebots.</p>
            <ul className="text-xs opacity-90 mt-3 space-y-1 list-disc list-inside">
              <li>Zugehörige Zielgruppen-Hauptseite</li>
              <li>Kursdetailseite</li>
              <li>Termin- und Buchungsdialog</li>
              <li>Admin-Anmeldungsübersicht</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  )
}
