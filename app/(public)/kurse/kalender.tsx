'use client'

import { useState, useMemo } from 'react'
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  GraduationCap
} from 'lucide-react'
import { FACH_LABELS, FACH_FARBEN, type Fach } from '@/types/kurs'
import { Button } from '@/app/components/ui/button'

// Generisches Kurs-Interface für Kalender
interface KursForKalender {
  id: number
  name: string
  fach: Fach
  beschreibung: string
  startDatum: string
  endDatum: string
  uhrzeit: string
  preis: number
  maxTeilnehmer: number
  aktuelleTeilnehmer: number
  status: 'offen' | 'wenige-plaetze' | 'ausgebucht'
}

interface KursKalenderProps {
  kurse: KursForKalender[]
  onKursClick: (kurs: KursForKalender) => void
  onAnmelden: (kurs: KursForKalender) => void
}

const WOCHENTAGE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const MONATE = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
]

export function KursKalender({ kurse, onKursClick, onAnmelden }: KursKalenderProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date()) // Heute als Default
  const [selectedKurs, setSelectedKurs] = useState<KursForKalender | null>(null)

  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()

  // Kalender-Tage berechnen
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1)
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0)
    
    // Montag als Wochenstart (0 = Montag, 6 = Sonntag)
    let startDay = firstDayOfMonth.getDay() - 1
    if (startDay === -1) startDay = 6
    
    const daysInMonth = lastDayOfMonth.getDate()
    const days: (Date | null)[] = []
    
    // Leere Tage am Anfang
    for (let i = 0; i < startDay; i++) {
      days.push(null)
    }
    
    // Tage des Monats
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(currentYear, currentMonth, i))
    }
    
    return days
  }, [currentMonth, currentYear])

  // Kurse nach Datum gruppieren
  const kurseByDate = useMemo(() => {
    const map = new Map<string, KursForKalender[]>()
    
    kurse.forEach((kurs) => {
      const start = new Date(kurs.startDatum)
      const end = new Date(kurs.endDatum)
      
      // Für jeden Tag im Kurs-Zeitraum
      const current = new Date(start)
      while (current <= end) {
        const key = current.toISOString().split('T')[0]
        if (!map.has(key)) {
          map.set(key, [])
        }
        map.get(key)!.push(kurs)
        current.setDate(current.getDate() + 1)
      }
    })
    
    return map
  }, [kurse])

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const formatDate = (date: Date) => date.toISOString().split('T')[0]

  const isToday = (date: Date | null) => {
    if (!date) return false
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  return (
    <div className="space-y-4">
      {/* Kalender-Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousMonth}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-muted-foreground" />
          </button>
          <h2 className="text-xl font-semibold text-foreground min-w-[180px] text-center">
            {MONATE[currentMonth]} {currentYear}
          </h2>
          <button
            onClick={goToNextMonth}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
        <button
          onClick={goToToday}
          className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
        >
          Heute
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Kalender-Grid */}
        <div className="flex-1 rounded-2xl border border-border bg-card overflow-hidden">
          {/* Wochentage */}
          <div className="grid grid-cols-7 border-b border-border bg-muted/30">
            {WOCHENTAGE.map((tag) => (
              <div
                key={tag}
                className="py-3 text-center text-sm font-medium text-muted-foreground"
              >
                {tag}
              </div>
            ))}
          </div>

          {/* Tage */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, index) => {
              const kurseAnDiesemTag = day ? kurseByDate.get(formatDate(day)) || [] : []
              const hasKurse = kurseAnDiesemTag.length > 0
              const heute = isToday(day)

              return (
                <div
                  key={index}
                  className={`min-h-[100px] border-b border-r border-border last:border-r-0 p-1.5 ${
                    day ? 'bg-background' : 'bg-muted/20'
                  } ${heute ? 'ring-2 ring-primary ring-inset' : ''}`}
                >
                  {day && (
                    <>
                      <div className={`text-sm font-medium mb-1 ${
                        heute 
                          ? 'text-primary' 
                          : hasKurse 
                            ? 'text-foreground' 
                            : 'text-muted-foreground'
                      }`}>
                        {day.getDate()}
                      </div>
                      <div className="space-y-1">
                        {kurseAnDiesemTag.slice(0, 3).map((kurs) => {
                          const farben = FACH_FARBEN[kurs.fach]
                          return (
                            <button
                              key={kurs.id}
                              onClick={() => setSelectedKurs(kurs)}
                              className={`w-full text-left px-1.5 py-0.5 rounded text-xs truncate ${farben.bg} ${farben.text} hover:opacity-80 transition-opacity`}
                            >
                              {kurs.name.split('–')[0].trim()}
                            </button>
                          )
                        })}
                        {kurseAnDiesemTag.length > 3 && (
                          <div className="text-xs text-muted-foreground px-1.5">
                            +{kurseAnDiesemTag.length - 3} weitere
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Sidebar: Ausgewählter Kurs */}
        <div className="lg:w-80">
          {selectedKurs ? (
            <KursPreview 
              kurs={selectedKurs} 
              onKursClick={onKursClick}
              onAnmelden={onAnmelden}
              onClose={() => setSelectedKurs(null)}
            />
          ) : (
            <div className="rounded-2xl border border-border bg-card p-6 text-center">
              <CalendarIcon className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Klicke auf einen Kurs im Kalender, um Details zu sehen.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Legende */}
      <div className="flex flex-wrap gap-3 pt-2">
        <span className="text-sm text-muted-foreground">Legende:</span>
        {Object.entries(FACH_LABELS).map(([fach, label]) => {
          const farben = FACH_FARBEN[fach as KursForKalender['fach']]
          return (
            <span
              key={fach}
              className={`px-2 py-0.5 text-xs rounded ${farben.bg} ${farben.text}`}
            >
              {label}
            </span>
          )
        })}
      </div>
    </div>
  )
}

// Kurs-Preview in Sidebar
interface KursPreviewProps {
  kurs: KursForKalender
  onKursClick: (kurs: KursForKalender) => void
  onAnmelden: (kurs: KursForKalender) => void
  onClose: () => void
}

function KursPreview({ kurs, onKursClick, onAnmelden, onClose }: KursPreviewProps) {
  const farben = FACH_FARBEN[kurs.fach]
  const plaetzeVerfuegbar = kurs.maxTeilnehmer - kurs.aktuelleTeilnehmer

  const formatDatum = (datum: string) => {
    return new Date(datum).toLocaleDateString('de-CH', {
      day: 'numeric',
      month: 'short',
    })
  }

  return (
    <div className={`rounded-2xl border ${farben.border} bg-card overflow-hidden`}>
      <div className={`${farben.bg} px-4 py-3 flex items-center justify-between`}>
        <span className={`text-sm font-medium ${farben.text}`}>
          {FACH_LABELS[kurs.fach]}
        </span>
        <button
          onClick={onClose}
          className={`${farben.text} hover:opacity-70`}
        >
          ✕
        </button>
      </div>
      
      <div className="p-4 space-y-4">
        <div>
          <h3 className="font-semibold text-foreground mb-1">{kurs.name}</h3>
          <p className="text-sm text-muted-foreground">{kurs.beschreibung}</p>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Datum:</span>
            <span className="text-foreground font-medium">
              {formatDatum(kurs.startDatum)} – {formatDatum(kurs.endDatum)}
            </span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Uhrzeit:</span>
            <span className="text-foreground font-medium">{kurs.uhrzeit}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Preis:</span>
            <span className="text-foreground font-medium">CHF {kurs.preis}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Plätze:</span>
            <span className={`font-medium ${
              kurs.status === 'ausgebucht' 
                ? 'text-red-600 dark:text-red-400' 
                : kurs.status === 'wenige-plaetze'
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-green-600 dark:text-green-400'
            }`}>
              {plaetzeVerfuegbar} / {kurs.maxTeilnehmer}
            </span>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={() => onKursClick(kurs)}
            className="flex-1 px-3 py-2 text-sm font-medium rounded-lg border border-border hover:bg-muted transition-colors"
          >
            Details
          </button>
          <Button
            onClick={() => onAnmelden(kurs)}
            disabled={kurs.status === 'ausgebucht'}
            className="flex-1 rounded-lg"
            size="sm"
          >
            <GraduationCap className="mr-1.5 h-4 w-4" />
            Anmelden
          </Button>
        </div>
      </div>
    </div>
  )
}
