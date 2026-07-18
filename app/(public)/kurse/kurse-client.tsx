'use client'

import { useState, useMemo } from 'react'
import { 
  Search, 
  Calendar as CalendarIcon,
  List,
  MapPin,
  Clock,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Star,
  X,
  Filter,
  ArrowUpDown
} from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { FACH_LABELS, FACH_FARBEN } from '@/types/kurs'
import { type KursDBMitAnmeldungen } from '@/types/kurs-form'
import { KursKalender } from './kalender'
import { AnmeldungModal } from './anmeldung-modal'

type ViewMode = 'liste' | 'kalender'
type FachFilter = KursDBMitAnmeldungen['fach'] | 'alle'
type SortOrder = 'asc' | 'desc'

// Konvertierung von DB-Kurs zu UI-Kurs
interface KursUI {
  id: number
  name: string
  fach: KursDBMitAnmeldungen['fach']
  beschreibung: string
  detailBeschreibung: string
  startDatum: string
  endDatum: string
  uhrzeit: string
  ort: string
  preis: number
  maxTeilnehmer: number
  aktuelleTeilnehmer: number
  klassenstufen: string[]
  lehrer: string
  highlights: string[]
  status: 'offen' | 'wenige-plaetze' | 'ausgebucht'
}

function dbKursToUI(kurs: KursDBMitAnmeldungen): KursUI {
  return {
    id: kurs.id,
    name: kurs.name,
    fach: kurs.fach,
    beschreibung: kurs.beschreibung,
    detailBeschreibung: kurs.detail_beschreibung || '',
    startDatum: kurs.start_datum,
    endDatum: kurs.end_datum,
    uhrzeit: kurs.uhrzeit,
    ort: kurs.ort,
    preis: kurs.preis,
    maxTeilnehmer: kurs.max_teilnehmer,
    aktuelleTeilnehmer: kurs.aktuelle_teilnehmer,
    klassenstufen: kurs.klassenstufen,
    lehrer: kurs.lehrer,
    highlights: kurs.highlights,
    status: kurs.status,
  }
}

interface KurseClientProps {
  initialKurse: KursDBMitAnmeldungen[]
}

export function KurseClient({ initialKurse }: KurseClientProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('liste')
  const [suchbegriff, setSuchbegriff] = useState('')
  const [fachFilter, setFachFilter] = useState<FachFilter>('alle')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [expandedKurs, setExpandedKurs] = useState<number | null>(null)
  const [anmeldungKurs, setAnmeldungKurs] = useState<KursUI | null>(null)

  // Konvertiere DB-Kurse zu UI-Kurse
  const kurse = initialKurse.map(dbKursToUI)

  // Kurse filtern und sortieren
  const gefilterteKurse = useMemo(() => {
    const heute = new Date()
    heute.setHours(0, 0, 0, 0) // Auf Mitternacht setzen für korrekten Vergleich
    
    return kurse
      .filter((kurs) => {
        // Nur zukünftige Kurse anzeigen (Startdatum >= heute)
        const startDatum = new Date(kurs.startDatum)
        startDatum.setHours(0, 0, 0, 0)
        const istZukuenftig = startDatum >= heute
        
        const matchSuche = 
          kurs.name.toLowerCase().includes(suchbegriff.toLowerCase()) ||
          kurs.beschreibung.toLowerCase().includes(suchbegriff.toLowerCase()) ||
          kurs.ort.toLowerCase().includes(suchbegriff.toLowerCase())
        
        const matchFach = fachFilter === 'alle' || kurs.fach === fachFilter
        
        return istZukuenftig && matchSuche && matchFach
      })
      .sort((a, b) => {
        const dateA = new Date(a.startDatum).getTime()
        const dateB = new Date(b.startDatum).getTime()
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA
      })
  }, [kurse, suchbegriff, fachFilter, sortOrder])

  return (
    <>
      {/* Filter & Ansichts-Wechsel */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Suchfeld */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Kurs suchen..."
            value={suchbegriff}
            onChange={(e) => setSuchbegriff(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
          />
          {suchbegriff && (
            <button
              onClick={() => setSuchbegriff('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Fach-Filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <select
            value={fachFilter}
            onChange={(e) => setFachFilter(e.target.value as FachFilter)}
            className="h-11 pl-10 pr-8 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors appearance-none cursor-pointer min-w-[180px]"
          >
            <option value="alle">Alle Fächer</option>
            {Object.entries(FACH_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Sortierung */}
        <button
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          className="flex items-center gap-2 h-11 px-4 rounded-xl border border-border bg-background text-foreground hover:bg-muted transition-colors"
          title={sortOrder === 'asc' ? 'Neueste zuerst' : 'Nächste zuerst'}
        >
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {sortOrder === 'asc' ? 'Nächste zuerst' : 'Späteste zuerst'}
          </span>
        </button>

        {/* Ansichts-Wechsel */}
        <div className="flex rounded-xl border border-border overflow-hidden">
          <button
            onClick={() => setViewMode('liste')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              viewMode === 'liste'
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <List className="h-4 w-4" />
            Liste
          </button>
          <button
            onClick={() => setViewMode('kalender')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              viewMode === 'kalender'
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <CalendarIcon className="h-4 w-4" />
            Kalender
          </button>
        </div>
      </div>

      {/* Ergebnis-Info */}
      <p className="text-sm text-muted-foreground mb-4">
        {gefilterteKurse.length} Kurs{gefilterteKurse.length !== 1 ? 'e' : ''} gefunden
      </p>

      {/* Kurse */}
      {viewMode === 'liste' ? (
        <div className="space-y-4">
          {gefilterteKurse.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Keine Kurse gefunden. Versuche andere Suchkriterien.
              </p>
            </div>
          ) : (
            gefilterteKurse.map((kurs) => (
              <KursKarte
                key={kurs.id}
                kurs={kurs}
                isExpanded={expandedKurs === kurs.id}
                onToggle={() => setExpandedKurs(expandedKurs === kurs.id ? null : kurs.id)}
                onAnmelden={() => setAnmeldungKurs(kurs)}
              />
            ))
          )}
        </div>
      ) : (
        <KursKalender 
          kurse={gefilterteKurse} 
          onKursClick={(kurs) => {
            // Zur Listenansicht wechseln und den Kurs expandieren
            setViewMode('liste')
            setExpandedKurs(kurs.id)
          }}
          onAnmelden={(kurs) => {
            // Finde den vollständigen Kurs aus der Liste
            const vollstaendigerKurs = kurse.find(k => k.id === kurs.id)
            if (vollstaendigerKurs) {
              setAnmeldungKurs(vollstaendigerKurs)
            }
          }}
        />
      )}

      {/* Anmeldungs-Modal */}
      {anmeldungKurs && (
        <AnmeldungModal
          kurs={anmeldungKurs}
          onClose={() => setAnmeldungKurs(null)}
        />
      )}
    </>
  )
}

// Kurs-Karte Komponente
interface KursKarteProps {
  kurs: KursUI
  isExpanded: boolean
  onToggle: () => void
  onAnmelden: () => void
}

function KursKarte({ kurs, isExpanded, onToggle, onAnmelden }: KursKarteProps) {
  const fachFarben = FACH_FARBEN[kurs.fach]
  const plaetzeVerfuegbar = kurs.maxTeilnehmer - kurs.aktuelleTeilnehmer
  
  const formatDatum = (datum: string) => {
    return new Date(datum).toLocaleDateString('de-CH', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const statusBadge = () => {
    switch (kurs.status) {
      case 'offen':
        return (
          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-secondary/15 text-secondary">
            {plaetzeVerfuegbar} Plätze frei
          </span>
        )
      case 'wenige-plaetze':
        return (
          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-subject-ma-pale text-subject-ma-foreground">
            Nur noch {plaetzeVerfuegbar} Plätze!
          </span>
        )
      case 'ausgebucht':
        return (
          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-destructive/10 text-destructive">
            Ausgebucht
          </span>
        )
    }
  }

  return (
    <div className={`rounded-2xl border ${fachFarben.border} bg-card shadow-sm overflow-hidden transition-all duration-300`}>
      {/* Header (immer sichtbar) */}
      <div 
        className="p-5 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={onToggle}
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${fachFarben.bg} ${fachFarben.text}`}>
                {FACH_LABELS[kurs.fach]}
              </span>
              {statusBadge()}
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-1">
              {kurs.name}
            </h3>
            <p className="text-muted-foreground text-sm">
              {kurs.beschreibung}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-2xl font-bold text-foreground">
                CHF {kurs.preis}
              </p>
              <p className="text-xs text-muted-foreground">pro Woche</p>
            </div>
            <button className="p-2 rounded-lg hover:bg-muted transition-colors">
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </button>
          </div>
        </div>

        {/* Quick Info */}
        <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CalendarIcon className="h-4 w-4" />
            {formatDatum(kurs.startDatum)} – {formatDatum(kurs.endDatum)}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            {kurs.uhrzeit}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4" />
            {kurs.ort}
          </span>
        </div>
      </div>

      {/* Expandierter Bereich */}
      {isExpanded && (
        <div className="border-t border-border px-5 py-5 bg-muted/20">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Details */}
            <div>
              <h4 className="font-semibold text-foreground mb-3">Kursbeschreibung</h4>
              <div className="text-sm text-muted-foreground whitespace-pre-line">
                {kurs.detailBeschreibung || kurs.beschreibung}
              </div>
            </div>

            {/* Info-Box */}
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-background p-4">
                <h4 className="font-semibold text-foreground mb-3">Kursdetails</h4>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Leitung:</dt>
                    <dd className="font-medium text-foreground">{kurs.lehrer}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Klassenstufen:</dt>
                    <dd className="font-medium text-foreground">{kurs.klassenstufen.join(', ')}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Gruppengrösse:</dt>
                    <dd className="font-medium text-foreground">Max. {kurs.maxTeilnehmer} Teilnehmer</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Verfügbar:</dt>
                    <dd className="font-medium text-foreground">
                      {plaetzeVerfuegbar} / {kurs.maxTeilnehmer} Plätze
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Highlights */}
              {kurs.highlights.length > 0 && (
                <div className="rounded-xl border border-border bg-background p-4">
                  <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Star className="h-4 w-4 text-accent" />
                    Highlights
                  </h4>
                  <ul className="space-y-1.5">
                    {kurs.highlights.map((highlight, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        {highlight}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* CTA */}
              <Button
                onClick={(e) => {
                  e.stopPropagation()
                  onAnmelden()
                }}
                disabled={kurs.status === 'ausgebucht'}
                className="w-full h-12 rounded-xl text-base font-semibold"
              >
                {kurs.status === 'ausgebucht' ? (
                  'Ausgebucht'
                ) : (
                  <>
                    <GraduationCap className="mr-2 h-5 w-5" />
                    Jetzt anmelden
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
