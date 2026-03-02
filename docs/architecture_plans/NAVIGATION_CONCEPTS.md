# ZAP Navigationskonzepte

> **Erstellt:** 23. Februar 2026  
> **Fokus:** Dynamische, klassenstufenbasierte Navigation für E-Learning-Plattform

---

## 📊 Datenbank-Analyse

### Relevante Tabellen & Felder

| Tabelle | Relevante Felder | Beschreibung |
|---------|-----------------|--------------|
| `intensivwoche_kurse` | `klassenstufen` (ARRAY), `fach`, `ist_aktiv` | Hauptquelle für Kursnavigation |
| `learning_materials` | `class_levels` (ARRAY), `subject_id` | Lernmaterialien pro Klassenstufe |
| `profiles` | `class_level` | Gespeicherte Klassenstufe des Schülers |
| `subjects` | `id`, `name` | Fächer (Mathematik, Deutsch, etc.) |

### Datenstruktur für Navigation

```typescript
// Verfügbare Klassenstufen (aus DB)
type Klassenstufe = '4. Klasse' | '5. Klasse' | '6. Klasse'

// Fächer
type Fach = 'mathematik' | 'deutsch' | 'franzoesisch' | 'natur-mensch-gesellschaft'

// Kurs mit Klassenstufen
interface Kurs {
  klassenstufen: string[]  // ["5. Klasse", "6. Klasse"]
  fach: Fach
  ist_aktiv: boolean
}
```

---

## 🎯 Option 1: "Smart Dashboard Tiles" (Personalisierte Kacheln)

### Konzept-Name & UX-Psychologie

**"Mein Lernbereich"** – Personalisierte, kontextbezogene Einstiegspunkte

**Warum funktioniert dieser Ansatz?**

| Prinzip | Anwendung |
|---------|-----------|
| **Recognition over Recall** | Visuell unterscheidbare Kacheln statt textlastiger Listen |
| **Progressive Disclosure** | Nur relevante Inhalte basierend auf gespeicherter Klassenstufe |
| **Personalization Effect** | "Meine Klasse" als primärer Einstieg erhöht Engagement um ~30% |
| **Fitts's Law** | Grosse Klick-Targets reduzieren Navigationszeit |

### Visuelle Beschreibung

#### Desktop (≥1024px)
```
┌─────────────────────────────────────────────────────────────┐
│  🎓 ZAP                    [🔍 Suche]    [👤 Profil]        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Hallo Robin! Du bist in der 5. Klasse.    [Klasse ändern]  │
│                                                              │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐    │
│  │ 📐            │  │ 📝            │  │ 🇫🇷            │    │
│  │ Mathematik    │  │ Deutsch       │  │ Französisch   │    │
│  │ ──────────    │  │ ──────────    │  │ ──────────    │    │
│  │ 12 Übungen    │  │ 8 Übungen     │  │ 5 Übungen     │    │
│  │ 2 Kurse       │  │ 1 Kurs        │  │ 1 Kurs        │    │
│  └───────────────┘  └───────────────┘  └───────────────┘    │
│                                                              │
│  📅 Kommende Intensivkurse für 5. Klasse                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Mathematik Intensiv • 6. Apr – 10. Apr • CHF 450    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### Mobile (≤768px)
```
┌─────────────────────────┐
│ 🎓 ZAP       [≡] [👤]   │
├─────────────────────────┤
│                         │
│ 5. Klasse  [⌄ ändern]   │
│                         │
│ ┌─────────┐ ┌─────────┐ │
│ │ 📐      │ │ 📝      │ │
│ │ Mathe   │ │ Deutsch │ │
│ │ 12 Üb.  │ │ 8 Üb.   │ │
│ └─────────┘ └─────────┘ │
│                         │
│ ┌─────────┐ ┌─────────┐ │
│ │ 🇫🇷      │ │ 🌍      │ │
│ │ Franz.  │ │ NMG     │ │
│ │ 5 Üb.   │ │ 3 Üb.   │ │
│ └─────────┘ └─────────┘ │
│                         │
│ [📅 Kurse ansehen]      │
│                         │
└─────────────────────────┘
```

### Technische Umsetzung

```typescript
// 1. Server Component für personalisierte Daten
async function getDashboardData(userId: string) {
  const supabase = await createServerClient()
  
  // Klassenstufe aus Profil holen
  const { data: profile } = await supabase
    .from('profiles')
    .select('class_level')
    .eq('id', userId)
    .single()
  
  const userClass = profile?.class_level || '5. Klasse'
  
  // Kurse für diese Klassenstufe
  const { data: kurse } = await supabase
    .from('intensivwoche_kurse')
    .select('*')
    .contains('klassenstufen', [userClass])
    .eq('ist_aktiv', true)
  
  // Materialien pro Fach zählen
  const { data: materials } = await supabase
    .from('learning_materials')
    .select('subject_id')
    .contains('class_levels', [userClass])
  
  return { userClass, kurse, materialCounts: groupBy(materials, 'subject_id') }
}

// 2. Klassenstufen-Switcher Komponente
'use client'
function ClassLevelSwitcher({ 
  current, 
  available 
}: { 
  current: string
  available: string[] 
}) {
  const [open, setOpen] = useState(false)
  
  return (
    <DropdownMenuComplex isOpen={open} onOpenChange={setOpen}>
      {available.map(level => (
        <button 
          key={level}
          onClick={() => updateUserClassLevel(level)}
          className={level === current ? 'bg-primary/10' : ''}
        >
          {level}
        </button>
      ))}
    </DropdownMenuComplex>
  )
}
```

### Vorteile / Nachteile

| ✅ Vorteile | ❌ Nachteile |
|------------|-------------|
| Minimale Navigationsentscheidungen | Erfordert User-Account für Personalisierung |
| Sofortiger Überblick über alle Angebote | Gäste sehen generische Ansicht |
| Klassenstufe als "Filter" immer sichtbar | Initial mehr Implementierungsaufwand |
| Gut für wiederkehrende Besucher | Weniger Entdeckungsfreude |

**Implementierungsaufwand:** ⭐⭐⭐ (Mittel)  
**Nutzererfahrung:** ⭐⭐⭐⭐⭐ (Exzellent)

---

## 🎯 Option 2: "Course Finder Wizard" (Geführter Onboarding-Flow)

### Konzept-Name & UX-Psychologie

**"Finde deinen Kurs"** – 3-Schritt-Wizard für Erstbesucher

**Warum funktioniert dieser Ansatz?**

| Prinzip | Anwendung |
|---------|-----------|
| **Goal Gradient Effect** | Fortschrittsbalken motiviert zum Abschluss |
| **Chunking** | Komplexe Auswahl in 3 einfache Schritte aufgeteilt |
| **Commitment & Consistency** | Nach Schritt 1 ist Abbruch psychologisch schwieriger |
| **Endowed Progress Effect** | "1 von 3" suggeriert bereits begonnene Reise |

### Visuelle Beschreibung

#### Desktop Flow
```
┌─────────────────────────────────────────────────────────────┐
│  🎓 ZAP    [Home]  [Über uns]  [Kontakt]    [→ Anmelden]    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│        ────●────────○────────○────                          │
│        Klasse     Fach      Kurs                            │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                                                      │    │
│  │     In welche Klasse geht dein Kind?                │    │
│  │                                                      │    │
│  │     ┌─────────┐  ┌─────────┐  ┌─────────┐          │    │
│  │     │         │  │  ██████ │  │         │          │    │
│  │     │ 4. Kl.  │  │ 5. Kl.  │  │ 6. Kl.  │          │    │
│  │     │ (12)    │  │ (23) ✓  │  │ (18)    │          │    │
│  │     └─────────┘  └─────────┘  └─────────┘          │    │
│  │                                                      │    │
│  │                              [Weiter →]             │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Schritt 2: Fach wählen
┌─────────────────────────────────────────────────────────────┐
│        ────●────────●────────○────                          │
│        Klasse     Fach      Kurs                            │
│                                                              │
│     Welches Fach interessiert euch?                         │
│                                                              │
│     ┌──────────────┐  ┌──────────────┐                      │
│     │ 📐           │  │ 📝           │                      │
│     │ Mathematik   │  │ Deutsch      │                      │
│     │ 8 Kurse      │  │ 5 Kurse      │                      │
│     └──────────────┘  └──────────────┘                      │
│                                                              │
│     [← Zurück]                        [Weiter →]            │
└─────────────────────────────────────────────────────────────┘

Schritt 3: Kurse zeigen
┌─────────────────────────────────────────────────────────────┐
│        ────●────────●────────●────                          │
│        Klasse     Fach      Kurs  ✓                         │
│                                                              │
│     Perfekt! Hier sind 8 Mathematik-Kurse für 5. Klasse:   │
│                                                              │
│     ┌───────────────────────────────────────────────────┐   │
│     │ Mathematik Intensiv – Frühjahr 2026               │   │
│     │ 6. Apr – 10. Apr • Lernzentrum Bern • CHF 450     │   │
│     │ [Mehr erfahren] [Direkt anmelden]                 │   │
│     └───────────────────────────────────────────────────┘   │
│                                                              │
│     [← Filter ändern]           [Alle Kurse anzeigen]       │
└─────────────────────────────────────────────────────────────┘
```

#### Mobile (Vollbild-Steps)
```
┌─────────────────────────┐
│ [✕]     1 / 3           │
├─────────────────────────┤
│                         │
│  ●───────○───────○      │
│                         │
│  In welche Klasse       │
│  geht dein Kind?        │
│                         │
│  ┌───────────────────┐  │
│  │    4. Klasse      │  │
│  │    (12 Kurse)     │  │
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │
│  │ ✓  5. Klasse      │  │
│  │    (23 Kurse)     │  │
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │
│  │    6. Klasse      │  │
│  │    (18 Kurse)     │  │
│  └───────────────────┘  │
│                         │
├─────────────────────────┤
│      [Weiter →]         │
└─────────────────────────┘
```

### Technische Umsetzung

```typescript
// 1. Wizard State Management
'use client'
import { useSearchParams, useRouter } from 'next/navigation'

type WizardStep = 'klasse' | 'fach' | 'ergebnis'

function CourseFinderWizard() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const step = (searchParams.get('step') || 'klasse') as WizardStep
  const selectedClass = searchParams.get('klasse')
  const selectedFach = searchParams.get('fach')
  
  const updateStep = (newStep: WizardStep, params: Record<string, string>) => {
    const newParams = new URLSearchParams(searchParams)
    newParams.set('step', newStep)
    Object.entries(params).forEach(([k, v]) => newParams.set(k, v))
    router.push(`/kursfinder?${newParams.toString()}`)
  }
  
  return (
    <div className="max-w-2xl mx-auto">
      <ProgressIndicator current={step} />
      
      {step === 'klasse' && (
        <ClassSelector 
          onSelect={(kl) => updateStep('fach', { klasse: kl })} 
        />
      )}
      
      {step === 'fach' && (
        <SubjectSelector 
          classLevel={selectedClass!}
          onSelect={(fach) => updateStep('ergebnis', { fach })}
          onBack={() => router.back()}
        />
      )}
      
      {step === 'ergebnis' && (
        <CourseResults 
          classLevel={selectedClass!}
          subject={selectedFach!}
        />
      )}
    </div>
  )
}

// 2. Dynamische Kurs-Zählung pro Klassenstufe
async function getClassLevelStats() {
  const supabase = await createServerClient()
  
  const classLevels = ['4. Klasse', '5. Klasse', '6. Klasse']
  
  const stats = await Promise.all(
    classLevels.map(async (level) => {
      const { count } = await supabase
        .from('intensivwoche_kurse')
        .select('*', { count: 'exact', head: true })
        .contains('klassenstufen', [level])
        .eq('ist_aktiv', true)
      
      return { level, count: count || 0 }
    })
  )
  
  return stats
}

// 3. URL-basiertes Deep Linking
// /kursfinder?step=ergebnis&klasse=5.%20Klasse&fach=mathematik
// → Direkt zur Ergebnisseite mit Filtern
```

### Vorteile / Nachteile

| ✅ Vorteile | ❌ Nachteile |
|------------|-------------|
| Ideal für Erstbesucher ohne Account | Erfahrene User empfinden es als "zu langsam" |
| Jeder Schritt ist teilbar (Deep Links) | 3 Klicks bis zum Ziel |
| Klare Führung reduziert Entscheidungsparalyse | Kein spontanes Entdecken |
| Hervorragend für Marketing-Landingpages | Mehr UI-Komponenten zu pflegen |

**Implementierungsaufwand:** ⭐⭐⭐⭐ (Höher)  
**Nutzererfahrung:** ⭐⭐⭐⭐ (Sehr gut für Neukunden)

---

## 🎯 Option 3: "Mega-Menu mit Smart Filters" (Erweiterte Navigation)

### Konzept-Name & UX-Psychologie

**"Alles auf einen Blick"** – Expandierendes Menü mit Live-Filterung

**Warum funktioniert dieser Ansatz?**

| Prinzip | Anwendung |
|---------|-----------|
| **Information Scent** | User sehen sofort alle verfügbaren Optionen |
| **Spatial Memory** | Konsistente Position hilft bei Wiedererkennung |
| **F-Pattern Reading** | Linke Spalte = Kategorien, Rechts = Details |
| **Reduced Decision Time** | Alles sichtbar ohne weiteren Klick |

### Visuelle Beschreibung

#### Desktop Mega-Menu
```
┌─────────────────────────────────────────────────────────────┐
│  🎓 ZAP    [Kurse ▾]  [Materialien]  [Trainer]    [👤]      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │                                                      │    │
│  │  KLASSENSTUFE         FÄCHER            KURSE       │    │
│  │  ─────────────        ──────            ─────       │    │
│  │                                                      │    │
│  │  ○ 4. Klasse          □ Mathematik      Mathematik  │    │
│  │  ● 5. Klasse (23)     ☑ Deutsch         Intensiv    │    │
│  │  ○ 6. Klasse          □ Französisch     ───────────  │    │
│  │                       □ NMG             6. Apr      │    │
│  │  ─────────────                          CHF 450     │    │
│  │  [Alle Kurse]                           [→]         │    │
│  │                                                      │    │
│  │                                         Deutsch     │    │
│  │                                         Intensiv    │    │
│  │                                         ───────────  │    │
│  │                                         13. Apr     │    │
│  │                                         CHF 420     │    │
│  │                                         [→]         │    │
│  │                                                      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### Mobile: Bottom Sheet mit Tabs
```
┌─────────────────────────┐
│ 🎓 ZAP      [Kurse] [👤]│
├─────────────────────────┤
│                         │
│   ↑ Slide up für Menu   │
│                         │
└─────────────────────────┘

[Kurse getippt]
          ↓
┌─────────────────────────┐
│ ═══════════════════════ │  ← Drag Handle
│                         │
│ ┌─────┬───────┬───────┐ │
│ │Klasse│ Fach │Termine│ │  ← Tabs
│ └─────┴───────┴───────┘ │
│                         │
│ ○ 4. Klasse    (12)     │
│ ● 5. Klasse    (23)     │
│ ○ 6. Klasse    (18)     │
│                         │
│ ──────────────────────  │
│                         │
│ Aktive Filter: 5. Kl.   │
│                         │
│ ┌─────────────────────┐ │
│ │ Mathe Intensiv      │ │
│ │ 6. Apr • CHF 450    │ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │ Deutsch Intensiv    │ │
│ │ 13. Apr • CHF 420   │ │
│ └─────────────────────┘ │
│                         │
│ [Alle 23 Kurse →]       │
│                         │
└─────────────────────────┘
```

### Technische Umsetzung

```typescript
// 1. Mega-Menu Komponente mit Live-Filter
'use client'
import { useState, useMemo } from 'react'

interface MegaMenuProps {
  kurse: Kurs[]
  klassenstufen: string[]
  faecher: Fach[]
}

function KurseMegaMenu({ kurse, klassenstufen, faecher }: MegaMenuProps) {
  const [selectedClass, setSelectedClass] = useState<string | null>(null)
  const [selectedFaecher, setSelectedFaecher] = useState<Set<Fach>>(new Set())
  const [isOpen, setIsOpen] = useState(false)
  
  // Live-Filterung
  const filteredKurse = useMemo(() => {
    return kurse.filter(kurs => {
      const matchesClass = !selectedClass || 
        kurs.klassenstufen.includes(selectedClass)
      const matchesFach = selectedFaecher.size === 0 || 
        selectedFaecher.has(kurs.fach)
      return matchesClass && matchesFach && kurs.ist_aktiv
    })
  }, [kurse, selectedClass, selectedFaecher])
  
  // Kurs-Zählung pro Klassenstufe
  const classStats = useMemo(() => {
    return klassenstufen.map(kl => ({
      level: kl,
      count: kurse.filter(k => 
        k.klassenstufen.includes(kl) && k.ist_aktiv
      ).length
    }))
  }, [kurse, klassenstufen])
  
  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 hover:bg-muted rounded-lg"
      >
        Kurse
        <ChevronDown className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        {selectedClass && (
          <span className="ml-2 px-2 py-0.5 text-xs bg-primary/10 rounded-full">
            {selectedClass}
          </span>
        )}
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-[800px] bg-card border rounded-2xl shadow-xl p-6 grid grid-cols-3 gap-6 z-50">
          {/* Spalte 1: Klassenstufen */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Klassenstufe
            </h3>
            <div className="space-y-1">
              {classStats.map(({ level, count }) => (
                <button
                  key={level}
                  onClick={() => setSelectedClass(
                    selectedClass === level ? null : level
                  )}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                    selectedClass === level 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-muted'
                  }`}
                >
                  <span>{level}</span>
                  <span className="text-sm opacity-70">({count})</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Spalte 2: Fächer */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Fächer
            </h3>
            <div className="space-y-1">
              {faecher.map(fach => (
                <label
                  key={fach}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedFaecher.has(fach)}
                    onChange={() => toggleFach(fach)}
                    className="rounded"
                  />
                  <span>{FACH_LABELS[fach]}</span>
                </label>
              ))}
            </div>
          </div>
          
          {/* Spalte 3: Kurs-Vorschau */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              {filteredKurse.length} Kurse gefunden
            </h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {filteredKurse.slice(0, 5).map(kurs => (
                <Link
                  key={kurs.id}
                  href={`/intensivkurse/${kurs.id}`}
                  className="block p-3 rounded-lg border hover:border-primary transition-colors"
                >
                  <p className="font-medium text-sm">{kurs.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(kurs.start_datum)} • CHF {kurs.preis}
                  </p>
                </Link>
              ))}
            </div>
            {filteredKurse.length > 5 && (
              <Link 
                href={`/intensivkurse?klasse=${selectedClass}&fach=${[...selectedFaecher].join(',')}`}
                className="mt-3 block text-sm text-primary hover:underline"
              >
                Alle {filteredKurse.length} Kurse anzeigen →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// 2. Server-seitige Daten für Mega-Menu
async function getMegaMenuData() {
  const supabase = await createServerClient()
  
  const { data: kurse } = await supabase
    .from('intensivwoche_kurse')
    .select('*')
    .eq('ist_aktiv', true)
    .order('start_datum', { ascending: true })
  
  // Alle verfügbaren Klassenstufen extrahieren
  const klassenstufen = [...new Set(
    kurse?.flatMap(k => k.klassenstufen) || []
  )].sort()
  
  // Alle verfügbaren Fächer
  const faecher = [...new Set(kurse?.map(k => k.fach) || [])]
  
  return { kurse, klassenstufen, faecher }
}

// 3. Mobile Bottom Sheet Alternative
'use client'
function MobileKursMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'klasse' | 'fach' | 'termine'>('klasse')
  
  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <button className="md:hidden px-4 py-2">Kurse</button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="klasse">Klasse</TabsTrigger>
            <TabsTrigger value="fach">Fach</TabsTrigger>
            <TabsTrigger value="termine">Termine</TabsTrigger>
          </TabsList>
          
          <TabsContent value="klasse">
            {/* Klassenstufen-Auswahl */}
          </TabsContent>
          
          <TabsContent value="fach">
            {/* Fächer-Filter */}
          </TabsContent>
          
          <TabsContent value="termine">
            {/* Kalender-Ansicht */}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
```

### Vorteile / Nachteile

| ✅ Vorteile | ❌ Nachteile |
|------------|-------------|
| Alles auf einen Blick, keine weiteren Klicks | Kann überwältigend wirken |
| Live-Filterung gibt sofortiges Feedback | Komplexe Implementierung |
| Vertrautes Pattern (wie Amazon, IKEA) | Mega-Menus auf Mobile schwierig |
| SEO-freundlich durch filterbare URLs | Mehr JavaScript für Interaktivität |

**Implementierungsaufwand:** ⭐⭐⭐⭐⭐ (Hoch)  
**Nutzererfahrung:** ⭐⭐⭐⭐ (Sehr gut für Power-User)

---

## 📊 Vergleichsmatrix

| Kriterium | Option 1: Dashboard Tiles | Option 2: Wizard | Option 3: Mega-Menu |
|-----------|--------------------------|------------------|---------------------|
| **Erstbesucher** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Wiederkehrende User** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Mobile Experience** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Implementierungsaufwand** | Mittel | Hoch | Sehr hoch |
| **Personalisierung** | Hoch | Niedrig | Mittel |
| **SEO / Deep Linking** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Skalierbarkeit** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## 🎯 Empfehlung

### Für ZAP empfehle ich eine **Hybrid-Lösung**:

1. **Startseite (nicht eingeloggt):** Option 2 (Wizard) als Hero-Element
   - "Finde den passenden Kurs in 30 Sekunden"
   - Führt Erstbesucher schnell zum Ziel

2. **Dashboard (eingeloggt):** Option 1 (Personalisierte Tiles)
   - Zeigt direkt relevante Inhalte basierend auf `profiles.class_level`
   - "Deine 5. Klasse Kurse" prominent sichtbar

3. **Navbar:** Vereinfachte Version von Option 3
   - Dropdown mit Klassenstufen + Live-Zählung
   - Kein komplettes Mega-Menu, aber mehr als einfache Links

### Umsetzungsreihenfolge

```
Phase 1 (Sprint 1): Dashboard Tiles für eingeloggte User
Phase 2 (Sprint 2): Klassenstufen-Dropdown in Navbar
Phase 3 (Sprint 3): Wizard für Landingpage / Marketing
```

---

## 📝 Nächste Schritte

- [ ] Entscheidung für initiales Konzept treffen
- [ ] Wireframes für gewähltes Konzept erstellen
- [ ] Supabase-Queries für Klassenstufen-Aggregation optimieren
- [ ] A/B-Test Setup für Konversionsrate planen
