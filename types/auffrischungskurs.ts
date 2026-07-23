import { z } from 'zod'

// Admin-Maske für courses/course_occurrences (separater Geschäftszweig: Auffrischungs-/
// Intensivkurse in Deutsch/Mathematik, bar vor Ort bezahlt, kein Bezug zu intensivwoche_kurse oder
// dem Offer-Katalog). Neue Kurse verwenden ausschliesslich diese zwei Standorte -- historische
// Live-Zeilen mit abweichenden Schuladressen bleiben unangetastet (kein DB-CHECK, analog
// intensivwoche_kurse.ort/STANDORT_OPTIONEN in types/kurs-edition.ts).
export const COURSE_LOCATIONS = [
  'FFSH Zürich, Zollstrasse 17, 8005 Zürich',
  'Schaffhauserstrasse 2, 8400 Winterthur',
] as const
export type CourseLocation = (typeof COURSE_LOCATIONS)[number]

export const courseFormSchema = z.object({
  title: z.string().trim().min(3, 'Titel muss mindestens 3 Zeichen haben').max(150, 'Titel darf maximal 150 Zeichen haben'),
  description: z
    .string()
    .trim()
    .min(10, 'Beschreibung muss mindestens 10 Zeichen haben')
    .max(600, 'Beschreibung darf maximal 600 Zeichen haben'),
  priceChf: z.coerce.number({ message: 'Preis muss eine Zahl sein' }).min(0, 'Preis darf nicht negativ sein').max(5000, 'Preis darf maximal CHF 5’000 sein'),
  location: z.enum(COURSE_LOCATIONS, { message: 'Bitte einen Standort wählen' }),
  paymentMethod: z.string().trim().min(2, 'Zahlungsart ist erforderlich').max(100, 'Zahlungsart darf maximal 100 Zeichen haben'),
})

export type CourseFormInput = z.infer<typeof courseFormSchema>

export const occurrenceFormSchema = z
  .object({
    startsAt: z.string().min(1, 'Start ist erforderlich'),
    endsAt: z.string().min(1, 'Ende ist erforderlich'),
  })
  .refine((data) => new Date(data.endsAt) > new Date(data.startsAt), {
    message: 'Ende muss nach dem Start liegen',
    path: ['endsAt'],
  })

export type OccurrenceFormInput = z.infer<typeof occurrenceFormSchema>

export type CourseDB = {
  id: number
  title: string | null
  description: string | null
  price: number | null
  location: string | null
  timezone: string | null
  created_at: string
  payment_method: string | null
}

export type CourseOccurrenceDB = {
  id: number
  starts_at_utc: string
  ends_at_utc: string
  course_id: number | null
}

export type ActionResult<T = void> =
  | { success: true; data?: T; message: string }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> }
