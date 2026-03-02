import { z } from 'zod'

// Zod Schema für Kurs-Erstellung/Bearbeitung
export const kursFormSchema = z.object({
  name: z
    .string()
    .min(5, 'Name muss mindestens 5 Zeichen haben')
    .max(100, 'Name darf maximal 100 Zeichen haben'),
  fach: z.enum(['mathematik', 'deutsch', 'franzoesisch', 'natur-mensch-gesellschaft'], {
    message: 'Bitte wähle ein Fach aus',
  }),
  beschreibung: z
    .string()
    .min(10, 'Beschreibung muss mindestens 10 Zeichen haben')
    .max(300, 'Beschreibung darf maximal 300 Zeichen haben'),
  detail_beschreibung: z
    .string()
    .max(2000, 'Detailbeschreibung darf maximal 2000 Zeichen haben')
    .optional(),
  start_datum: z.string().min(1, 'Startdatum ist erforderlich'),
  end_datum: z.string().min(1, 'Enddatum ist erforderlich'),
  uhrzeit: z
    .string()
    .min(5, 'Uhrzeit ist erforderlich')
    .max(20, 'Uhrzeit darf maximal 20 Zeichen haben'),
  ort: z
    .string()
    .min(5, 'Ort muss mindestens 5 Zeichen haben')
    .max(100, 'Ort darf maximal 100 Zeichen haben'),
  preis: z
    .number({ message: 'Preis muss eine Zahl sein' })
    .min(0, 'Preis darf nicht negativ sein')
    .max(10000, 'Preis darf maximal 10000 sein'),
  max_teilnehmer: z
    .number({ message: 'Teilnehmerzahl muss eine Zahl sein' })
    .int('Teilnehmerzahl muss eine ganze Zahl sein')
    .min(1, 'Mindestens 1 Teilnehmer')
    .max(50, 'Maximal 50 Teilnehmer'),
  klassenstufen: z
    .array(z.string())
    .min(1, 'Mindestens eine Klassenstufe erforderlich'),
  lehrer: z
    .string()
    .min(2, 'Lehrername muss mindestens 2 Zeichen haben')
    .max(100, 'Lehrername darf maximal 100 Zeichen haben'),
  highlights: z.array(z.string()).default([]),
  ist_aktiv: z.boolean().default(true),
})

export type KursFormInput = z.infer<typeof kursFormSchema>

// Datenbank-Row Type
export interface KursDB {
  id: number
  name: string
  fach: 'mathematik' | 'deutsch' | 'franzoesisch' | 'natur-mensch-gesellschaft'
  beschreibung: string
  detail_beschreibung: string | null
  start_datum: string
  end_datum: string
  uhrzeit: string
  ort: string
  preis: number
  max_teilnehmer: number
  klassenstufen: string[]
  lehrer: string
  highlights: string[]
  ist_aktiv: boolean
  created_at: string
  updated_at: string
  created_by: string | null // Owner-Tracking für RLS
}

// View mit Anmeldezahlen
export interface KursDBMitAnmeldungen extends KursDB {
  aktuelle_teilnehmer: number
  status: 'offen' | 'wenige-plaetze' | 'ausgebucht'
}

// Für Lehrperson: zeigt ob eigener Kurs
export interface KursDBMitOwner extends KursDBMitAnmeldungen {
  isOwner: boolean
}
