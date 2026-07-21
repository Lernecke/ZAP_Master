import { z } from 'zod'

// Schritt 10d (Abschnitt 2.15 des Architektur-Briefings): Domain-Typen fuer das Finanz-Cockpit.

export type FinancialEventType =
  | 'booking'
  | 'payment'
  | 'refund'
  | 'payroll_cost'
  | 'course_expense'
  | 'overhead'
  | 'manual_adjustment'

export type ExpenseCategory = 'room' | 'material' | 'marketing' | 'external_service' | 'overhead'

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  room: 'Räume',
  material: 'Material & IT',
  marketing: 'Marketing',
  external_service: 'Externe Leistungen',
  overhead: 'Sonstiges',
}

export type RevenueBasis = 'booked' | 'paid' | 'recognized'

export const REVENUE_BASIS_LABELS: Record<RevenueBasis, string> = {
  booked: 'Gebucht',
  paid: 'Bezahlt',
  recognized: 'Periodengerecht verdient',
}

export type FinancialEventDB = {
  id: string
  event_type: FinancialEventType
  source_kind: string
  source_id: string
  event_version: number
  amount_rappen: number
  currency: string
  occurred_at: string
  recognized_at: string
  edition_id: string | null
  session_id: number | null
  audience_id: string | null
  status: 'pending' | 'confirmed' | 'cancelled'
}

export type ExpenseEntryDB = {
  id: string
  category: ExpenseCategory
  amount_rappen: number
  currency: string
  service_date: string
  edition_id: string | null
  session_id: number | null
  receipt_ref: string | null
  status: 'draft' | 'approved' | 'cancelled'
  created_by: string
  version: number
}

export type FinancialPeriodDB = {
  id: string
  year: number
  status: 'open' | 'review' | 'locked'
  version: number
  locked_at: string | null
  locked_by: string | null
}

export type BudgetDB = {
  id: string
  period_id: string
  category: string
  amount_rappen: number
  currency: string
  version: number
}

export type OfferFinancialSummary = {
  editionId: string
  offerLabel: string
  audienceId: string
  schoolYear: string
  participantCount: number
  sessionCount: number
  capacity: number | null
  occupancyApplicable: boolean
  bookedRevenueRappen: number
  paidRevenueRappen: number
  recognizedRevenueRappen: number
  refundRappen: number
  approvedWorkMinutes: number
  directCostRappen: number
}

export const expenseEntryFormSchema = z.object({
  category: z.enum(['room', 'material', 'marketing', 'external_service', 'overhead'] satisfies [ExpenseCategory, ...ExpenseCategory[]]),
  amountChf: z.coerce.number({ message: 'Betrag muss eine Zahl sein' }).positive('Betrag muss positiv sein'),
  serviceDate: z.string().min(1, 'Leistungsdatum ist erforderlich'),
  receiptRef: z.string().max(100).optional().nullable(),
})

export type ExpenseEntryFormInput = z.infer<typeof expenseEntryFormSchema>

export const financialAdjustmentFormSchema = z.object({
  amountChf: z.coerce.number({ message: 'Betrag muss eine Zahl sein' }).refine((v) => v !== 0, 'Betrag darf nicht 0 sein'),
  category: z.string().max(50).optional().nullable(),
  reason: z.string().min(5, 'Begründung muss mindestens 5 Zeichen haben').max(500),
})

export type FinancialAdjustmentFormInput = z.infer<typeof financialAdjustmentFormSchema>

export type FinanzenActionResult<T = void> =
  | { success: true; data?: T; message: string }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> }
