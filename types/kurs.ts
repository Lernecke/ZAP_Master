// Kurs-Typen für Intensivwochen

export type Fach = 'mathematik' | 'deutsch' | 'franzoesisch' | 'natur-mensch-gesellschaft'

export interface Kurs {
  id: number
  name: string
  fach: Fach
  beschreibung: string
  detailBeschreibung: string
  startDatum: string // ISO Date
  endDatum: string // ISO Date
  uhrzeit: string // z.B. "09:00 - 12:00"
  ort: string
  preis: number
  maxTeilnehmer: number
  aktuelleTeilnehmer: number
  klassenstufen: string[] // z.B. ["5. Klasse", "6. Klasse"]
  lehrer: string
  highlights: string[]
  status: 'offen' | 'wenige-plaetze' | 'ausgebucht'
}

export const FACH_LABELS: Record<Fach, string> = {
  mathematik: 'Mathematik',
  deutsch: 'Deutsch',
  franzoesisch: 'Französisch',
  'natur-mensch-gesellschaft': 'Natur, Mensch, Gesellschaft',
}

// Fach-Farbcodierung folgt dem markenweiten System aus
// design-reference/architektur-briefing-kursseiten.md Abschnitt 1:
// Sage=Deutsch, Gold=Mathematik, Rost/Rosé=Französisch, Steel=NMG.
// Setzt .brand-marketing als Vorfahren voraus (siehe app/globals.css).
export const FACH_FARBEN: Record<Fach, { bg: string; text: string; border: string }> = {
  mathematik: {
    bg: 'bg-subject-ma-pale',
    text: 'text-subject-ma-foreground',
    border: 'border-subject-ma/40',
  },
  deutsch: {
    bg: 'bg-subject-de-pale',
    text: 'text-subject-de-foreground',
    border: 'border-subject-de/40',
  },
  franzoesisch: {
    bg: 'bg-subject-fr-pale',
    text: 'text-subject-fr-foreground',
    border: 'border-subject-fr/40',
  },
  'natur-mensch-gesellschaft': {
    bg: 'bg-subject-nmg-pale',
    text: 'text-subject-nmg-foreground',
    border: 'border-subject-nmg/40',
  },
}

// Mock-Daten für Entwicklung
export const MOCK_KURSE: Kurs[] = [
  {
    id: 1,
    name: 'Mathematik Intensiv – Frühjahr 2026',
    fach: 'mathematik',
    beschreibung: 'Intensive Vorbereitung auf die ZAP-Prüfung im Fach Mathematik.',
    detailBeschreibung: `In dieser Intensivwoche arbeiten wir gezielt an den Kernthemen der ZAP-Mathematikprüfung. 
    
Wir behandeln:
- Bruchrechnen und Prozentrechnung
- Geometrie (Flächen, Körper, Winkel)
- Textaufgaben und Sachrechnen
- Gleichungen und Variablen
- Prüfungsstrategien und Zeitmanagement

Jeder Tag beginnt mit einer kurzen Theorie-Einheit, gefolgt von intensiven Übungsphasen. Am Ende der Woche simulieren wir eine echte Prüfungssituation.`,
    startDatum: '2026-04-06',
    endDatum: '2026-04-10',
    uhrzeit: '09:00 - 12:00',
    ort: 'Lernzentrum Bern, Bahnhofstrasse 12',
    preis: 450,
    maxTeilnehmer: 12,
    aktuelleTeilnehmer: 8,
    klassenstufen: ['5. Klasse', '6. Klasse'],
    lehrer: 'Dr. Maria Schneider',
    highlights: ['Kleine Gruppen', 'Original-Prüfungsaufgaben', 'Persönliches Feedback'],
    status: 'offen',
  },
  {
    id: 2,
    name: 'Deutsch Intensiv – Frühjahr 2026',
    fach: 'deutsch',
    beschreibung: 'Grammatik, Rechtschreibung und Textverständnis für die ZAP.',
    detailBeschreibung: `Diese Intensivwoche fokussiert auf alle sprachlichen Kompetenzen, die für die ZAP geprüft werden.

Schwerpunkte:
- Grammatik (Satzglieder, Zeitformen, Fälle)
- Rechtschreibung und Zeichensetzung
- Textverständnis und Interpretation
- Aufsatzschreiben (Erörterung, Erzählung)
- Wortschatztraining

Mit vielen praktischen Übungen und individueller Korrektur deiner Texte.`,
    startDatum: '2026-04-06',
    endDatum: '2026-04-10',
    uhrzeit: '13:30 - 16:30',
    ort: 'Lernzentrum Bern, Bahnhofstrasse 12',
    preis: 450,
    maxTeilnehmer: 12,
    aktuelleTeilnehmer: 11,
    klassenstufen: ['5. Klasse', '6. Klasse'],
    lehrer: 'Lic. phil. Thomas Müller',
    highlights: ['Textkorrektur', 'Schreibtraining', 'Grammatik-Übungen'],
    status: 'wenige-plaetze',
  },
  {
    id: 3,
    name: 'Französisch Intensiv – Frühjahr 2026',
    fach: 'franzoesisch',
    beschreibung: 'Konversation, Grammatik und Hörverständnis auf Französisch.',
    detailBeschreibung: `Verbessere dein Französisch in einer intensiven Woche mit Native Speaker.

Wir trainieren:
- Mündliche Kommunikation
- Hörverständnis mit authentischen Texten
- Grammatik (Verben, Zeiten, Pronomen)
- Leseverständnis
- Schriftlicher Ausdruck

Der Unterricht findet zu 80% auf Französisch statt!`,
    startDatum: '2026-04-13',
    endDatum: '2026-04-17',
    uhrzeit: '09:00 - 12:00',
    ort: 'Lernzentrum Bern, Bahnhofstrasse 12',
    preis: 480,
    maxTeilnehmer: 10,
    aktuelleTeilnehmer: 4,
    klassenstufen: ['6. Klasse'],
    lehrer: 'Marie Dubois',
    highlights: ['Native Speaker', '80% Französisch', 'Kleine Gruppen'],
    status: 'offen',
  },
  {
    id: 4,
    name: 'NMG Intensiv – Frühjahr 2026',
    fach: 'natur-mensch-gesellschaft',
    beschreibung: 'Natur, Mensch, Gesellschaft – alles für die Prüfung.',
    detailBeschreibung: `Der NMG-Kurs deckt alle prüfungsrelevanten Themen ab.

Inhalte:
- Biologie (Mensch, Tiere, Pflanzen)
- Geografie (Schweiz, Europa, Welt)
- Geschichte (Schweizer Geschichte)
- Physik/Chemie Grundlagen
- Aktuelle Themen

Mit Experimenten, Karten und interaktiven Übungen.`,
    startDatum: '2026-04-13',
    endDatum: '2026-04-17',
    uhrzeit: '13:30 - 16:30',
    ort: 'Lernzentrum Bern, Bahnhofstrasse 12',
    preis: 420,
    maxTeilnehmer: 14,
    aktuelleTeilnehmer: 14,
    klassenstufen: ['5. Klasse', '6. Klasse'],
    lehrer: 'Stefan Bauer',
    highlights: ['Experimente', 'Interaktiv', 'Prüfungssimulation'],
    status: 'ausgebucht',
  },
  {
    id: 5,
    name: 'Mathematik Intensiv – Sommer 2026',
    fach: 'mathematik',
    beschreibung: 'Sommerferien-Intensivkurs Mathematik für die ZAP.',
    detailBeschreibung: `Der perfekte Kurs in den Sommerferien, um sich optimal vorzubereiten.

Gleicher Inhalt wie der Frühjahrskurs, aber mit mehr Zeit für individuelle Fragen und Übungen.`,
    startDatum: '2026-07-06',
    endDatum: '2026-07-10',
    uhrzeit: '09:00 - 12:00',
    ort: 'Lernzentrum Zürich, Limmatstrasse 45',
    preis: 450,
    maxTeilnehmer: 12,
    aktuelleTeilnehmer: 2,
    klassenstufen: ['5. Klasse', '6. Klasse'],
    lehrer: 'Dr. Maria Schneider',
    highlights: ['Sommerferien', 'Kleine Gruppen', 'Individuelle Betreuung'],
    status: 'offen',
  },
  {
    id: 6,
    name: 'Deutsch Intensiv – Sommer 2026',
    fach: 'deutsch',
    beschreibung: 'Sommerferien-Intensivkurs Deutsch für die ZAP.',
    detailBeschreibung: `Nutze die Sommerferien, um dein Deutsch auf Prüfungsniveau zu bringen.

Fokus auf Aufsatzschreiben und Textverständnis.`,
    startDatum: '2026-07-06',
    endDatum: '2026-07-10',
    uhrzeit: '13:30 - 16:30',
    ort: 'Lernzentrum Zürich, Limmatstrasse 45',
    preis: 450,
    maxTeilnehmer: 12,
    aktuelleTeilnehmer: 0,
    klassenstufen: ['5. Klasse', '6. Klasse'],
    lehrer: 'Lic. phil. Anna Weber',
    highlights: ['Sommerferien', 'Aufsatztraining', 'Individuelle Korrektur'],
    status: 'offen',
  },
]
