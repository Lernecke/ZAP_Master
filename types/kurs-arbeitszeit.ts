import { z } from 'zod'

// Schritt 10c (Abschnitt 2.14 des Architektur-Briefings): Domain-Typen fuer Arbeitszeiten und
// Lohnvorbereitung.
//
// Vereinfachung gegenueber dem Mockup: Die Spalten "Geplant" und "Abweichung" (Soll/Ist-Vergleich)
// entfallen -- es gibt keine strukturierte Quelle fuer die geplante Kursdauer in Stunden
// (intensivwoche_kurse.uhrzeit ist Freitext, siehe Kommentar in der Schema-Migration). Ohne echte
// Sollstunden waere ein "Soll"-Wert erfunden. WorkTimeOverview zeigt deshalb nur die tatsaechlich
// erfassten Groessen: eingereicht, genehmigt, Lohnkosten.

export type WorkActivityType =
  | 'course_teaching'
  | 'exam_supervision'
  | 'essay_feedback'
  | 'coaching'
  | 'preparation'
  | 'administration'
  | 'other'

export const WORK_ACTIVITY_TYPE_LABELS: Record<WorkActivityType, string> = {
  course_teaching: 'Kursunterricht',
  exam_supervision: 'Prüfungsaufsicht',
  essay_feedback: 'Aufsatzfeedback',
  coaching: 'Coaching',
  preparation: 'Vorbereitung',
  administration: 'Administration',
  other: 'Sonstiges',
}

export type WorkEntryStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'locked'

export const WORK_ENTRY_STATUS_LABELS: Record<WorkEntryStatus, string> = {
  draft: 'Entwurf',
  submitted: 'Zur Prüfung eingereicht',
  approved: 'Genehmigt',
  rejected: 'Zurückgewiesen',
  locked: 'Abgerechnet',
}

export type WorkEntryDB = {
  id: string
  teacher_id: string
  activity_type: WorkActivityType
  work_date: string
  duration_minutes: number
  session_id: number | null
  submission_id: string | null
  note: string | null
  status: WorkEntryStatus
  version: number
  approved_by: string | null
  approved_at: string | null
  rejection_reason: string | null
  created_at: string
  updated_at: string
}

export type TeacherAssignmentDB = {
  id: string
  teacher_id: string
  session_id: number
  role: 'lead' | 'assistant' | 'exam_supervisor'
  valid_from: string
  valid_until: string | null
}

export type TeacherRateAgreementDB = {
  id: string
  teacher_id: string
  hourly_rate_rappen: number
  currency: string
  valid_from: string
  valid_until: string | null
  version: number
  created_by: string
  created_at: string
}

export type PayrollPeriodDB = {
  id: string
  year: number
  month: number
  status: 'open' | 'review' | 'locked'
  version: number
  locked_at: string | null
  locked_by: string | null
}

export const workEntryFormSchema = z.object({
  activityType: z.enum([
    'course_teaching',
    'exam_supervision',
    'essay_feedback',
    'coaching',
    'preparation',
    'administration',
    'other',
  ] satisfies [WorkActivityType, ...WorkActivityType[]]),
  workDate: z.string().min(1, 'Datum ist erforderlich'),
  durationMinutes: z.coerce
    .number({ message: 'Dauer muss eine Zahl sein' })
    .int('Dauer muss in ganzen Minuten angegeben werden')
    .min(1, 'Dauer muss mindestens 1 Minute sein')
    .max(720, 'Dauer darf maximal 12 Stunden (720 Min.) sein'),
  sessionId: z.number().int().positive().optional().nullable(),
  note: z.string().max(500, 'Notiz darf maximal 500 Zeichen haben').optional().nullable(),
})

export type WorkEntryFormInput = z.infer<typeof workEntryFormSchema>

export const rateAgreementFormSchema = z
  .object({
    hourlyRateChf: z.coerce
      .number({ message: 'Stundensatz muss eine Zahl sein' })
      .positive('Stundensatz muss positiv sein')
      .max(500, 'Stundensatz darf maximal CHF 500 sein'),
    validFrom: z.string().min(1, 'Gültig ab ist erforderlich'),
  })
  .refine((data) => !Number.isNaN(Date.parse(data.validFrom)), {
    message: 'Ungültiges Datum',
    path: ['validFrom'],
  })

export type RateAgreementFormInput = z.infer<typeof rateAgreementFormSchema>

export type ArbeitszeitActionResult<T = void> =
  | { success: true; data?: T; message: string }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> }
