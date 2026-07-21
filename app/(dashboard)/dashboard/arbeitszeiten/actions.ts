'use server'

// Schritt 10c (Abschnitt 2.14 des Architektur-Briefings): Admin-Server-Actions fuer
// WorkTimeOverview/PayrollReviewPanel. Wie die uebrigen Admin-Actions dieser Session durchgehend
// admin-only (requireAdminAuth()) und createAuthenticatedSupabaseClient().

import { createAuthenticatedSupabaseClient } from '@/lib/supabase/server'
import { auth } from '@/lib/auth/config'
import { revalidatePath } from 'next/cache'
import {
  rateAgreementFormSchema,
  type RateAgreementFormInput,
  type WorkEntryDB,
  type TeacherRateAgreementDB,
  type PayrollPeriodDB,
  type ArbeitszeitActionResult,
} from '@/types/kurs-arbeitszeit'

async function requireAdminAuth(): Promise<
  | { authorized: true; userId: string; supabaseAccessToken: string }
  | { authorized: false; error: ArbeitszeitActionResult<never> }
> {
  const session = await auth()
  if (!session?.user || !session.supabaseAccessToken) {
    return { authorized: false, error: { success: false, error: 'Du musst angemeldet sein, um diese Aktion auszuführen.' } }
  }
  if (session.user.role !== 'admin') {
    return { authorized: false, error: { success: false, error: 'Nur Administratorinnen und Administratoren verwalten Arbeitszeiten und Lohn.' } }
  }
  return { authorized: true, userId: session.user.id, supabaseAccessToken: session.supabaseAccessToken }
}

export type TeacherOverviewRow = {
  teacherId: string
  name: string
  submittedMinutes: number
  approvedMinutes: number
  pendingCount: number
  payrollEstimateRappen: number
  currentRateRappen: number | null
}

function monthRange(year: number, month: number): { start: string; end: string } {
  const start = new Date(Date.UTC(year, month - 1, 1))
  const end = new Date(Date.UTC(year, month, 0))
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) }
}

export async function getTeacherOverviewForPeriod(
  year: number,
  month: number
): Promise<ArbeitszeitActionResult<TeacherOverviewRow[]>> {
  const authCheck = await requireAdminAuth()
  if (!authCheck.authorized) return authCheck.error

  const supabase = createAuthenticatedSupabaseClient(authCheck.supabaseAccessToken)
  const { start, end } = monthRange(year, month)

  const [teachersResult, entriesResult, ratesResult] = await Promise.all([
    supabase.from('profiles').select('id, first_name, last_name, email').eq('role', 'lehrperson'),
    supabase.from('work_entries').select('*').gte('work_date', start).lte('work_date', end),
    supabase.from('teacher_rate_agreements').select('*').is('valid_until', null),
  ])

  if (teachersResult.error || entriesResult.error || ratesResult.error) {
    console.error('Supabase Error:', teachersResult.error, entriesResult.error, ratesResult.error)
    return { success: false, error: 'Übersicht konnte nicht geladen werden.' }
  }

  const entries = (entriesResult.data ?? []) as WorkEntryDB[]
  const rateByTeacher = new Map((ratesResult.data ?? []).map((r) => [r.teacher_id, r.hourly_rate_rappen]))

  const rows: TeacherOverviewRow[] = (teachersResult.data ?? []).map((teacher) => {
    const own = entries.filter((e) => e.teacher_id === teacher.id)
    const submittedMinutes = own.filter((e) => ['submitted', 'approved', 'locked'].includes(e.status)).reduce((sum, e) => sum + e.duration_minutes, 0)
    const approvedMinutes = own.filter((e) => ['approved', 'locked'].includes(e.status)).reduce((sum, e) => sum + e.duration_minutes, 0)
    const pendingCount = own.filter((e) => e.status === 'submitted').length
    const rate = rateByTeacher.get(teacher.id) ?? null
    const payrollEstimateRappen = rate != null ? Math.round((approvedMinutes * rate) / 60) : 0

    return {
      teacherId: teacher.id,
      name: [teacher.first_name, teacher.last_name].filter(Boolean).join(' ') || teacher.email || 'Unbenannt',
      submittedMinutes,
      approvedMinutes,
      pendingCount,
      payrollEstimateRappen,
      currentRateRappen: rate,
    }
  })

  return { success: true, data: rows, message: 'Übersicht geladen' }
}

export async function getEntriesForTeacherInPeriod(
  teacherId: string,
  year: number,
  month: number
): Promise<ArbeitszeitActionResult<WorkEntryDB[]>> {
  const authCheck = await requireAdminAuth()
  if (!authCheck.authorized) return authCheck.error

  const supabase = createAuthenticatedSupabaseClient(authCheck.supabaseAccessToken)
  const { start, end } = monthRange(year, month)
  const { data, error } = await supabase
    .from('work_entries')
    .select('*')
    .eq('teacher_id', teacherId)
    .gte('work_date', start)
    .lte('work_date', end)
    .order('work_date', { ascending: false })

  if (error) {
    console.error('Supabase Error:', error)
    return { success: false, error: 'Einträge konnten nicht geladen werden.' }
  }
  return { success: true, data: data as WorkEntryDB[], message: 'Einträge geladen' }
}

export async function getCurrentRateAgreement(teacherId: string): Promise<ArbeitszeitActionResult<TeacherRateAgreementDB | null>> {
  const authCheck = await requireAdminAuth()
  if (!authCheck.authorized) return authCheck.error

  const supabase = createAuthenticatedSupabaseClient(authCheck.supabaseAccessToken)
  const { data, error } = await supabase
    .from('teacher_rate_agreements')
    .select('*')
    .eq('teacher_id', teacherId)
    .is('valid_until', null)
    .maybeSingle()

  if (error) {
    console.error('Supabase Error:', error)
    return { success: false, error: 'Lohnvereinbarung konnte nicht geladen werden.' }
  }
  return { success: true, data: data as TeacherRateAgreementDB | null, message: 'Lohnvereinbarung geladen' }
}

export async function saveRateAgreementAction(
  teacherId: string,
  input: RateAgreementFormInput
): Promise<ArbeitszeitActionResult<string>> {
  const authCheck = await requireAdminAuth()
  if (!authCheck.authorized) return authCheck.error

  const parsed = rateAgreementFormSchema.safeParse(input)
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {}
    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0] as string
      if (!fieldErrors[field]) fieldErrors[field] = []
      fieldErrors[field].push(issue.message)
    })
    return { success: false, error: 'Bitte überprüfe deine Eingaben.', fieldErrors }
  }

  const supabase = createAuthenticatedSupabaseClient(authCheck.supabaseAccessToken)
  const { data: newId, error } = await supabase.rpc('admin_save_rate_agreement', {
    p_teacher_id: teacherId,
    p_hourly_rate_rappen: Math.round(parsed.data.hourlyRateChf * 100),
    p_valid_from: parsed.data.validFrom,
  })

  if (error) {
    console.error('Supabase RPC Error:', error)
    return { success: false, error: 'Lohnvereinbarung konnte nicht gespeichert werden.' }
  }

  revalidatePath('/dashboard/arbeitszeiten')
  return { success: true, data: newId as string, message: 'Neue Lohnvereinbarung gespeichert · frühere Sätze bleiben erhalten.' }
}

export async function approveWorkEntryAction(entryId: string, expectedVersion: number): Promise<ArbeitszeitActionResult> {
  const authCheck = await requireAdminAuth()
  if (!authCheck.authorized) return authCheck.error

  const supabase = createAuthenticatedSupabaseClient(authCheck.supabaseAccessToken)
  const { error } = await supabase
    .from('work_entries')
    .update({ status: 'approved', approved_by: authCheck.userId, approved_at: new Date().toISOString() })
    .eq('id', entryId)
    .eq('version', expectedVersion)

  if (error) {
    console.error('Supabase Error:', error)
    return { success: false, error: 'Eintrag konnte nicht genehmigt werden. Bitte lade die Seite neu.' }
  }
  revalidatePath('/dashboard/arbeitszeiten')
  return { success: true, message: 'Zeiten genehmigt · Audit-Eintrag erstellt.' }
}

export async function rejectWorkEntryAction(
  entryId: string,
  expectedVersion: number,
  reason: string
): Promise<ArbeitszeitActionResult> {
  const authCheck = await requireAdminAuth()
  if (!authCheck.authorized) return authCheck.error
  if (!reason.trim()) {
    return { success: false, error: 'Eine Begründung ist für die Zurückweisung erforderlich.' }
  }

  const supabase = createAuthenticatedSupabaseClient(authCheck.supabaseAccessToken)
  const { error } = await supabase
    .from('work_entries')
    .update({ status: 'rejected', rejection_reason: reason.trim() })
    .eq('id', entryId)
    .eq('version', expectedVersion)

  if (error) {
    console.error('Supabase Error:', error)
    return { success: false, error: 'Eintrag konnte nicht zurückgewiesen werden. Bitte lade die Seite neu.' }
  }
  revalidatePath('/dashboard/arbeitszeiten')
  return { success: true, message: 'Einträge mit Begründung an die Lehrperson zurückgegeben.' }
}

export async function getPayrollPeriodStatus(year: number, month: number): Promise<ArbeitszeitActionResult<PayrollPeriodDB | null>> {
  const authCheck = await requireAdminAuth()
  if (!authCheck.authorized) return authCheck.error

  const supabase = createAuthenticatedSupabaseClient(authCheck.supabaseAccessToken)
  const { data, error } = await supabase
    .from('payroll_periods')
    .select('*')
    .eq('year', year)
    .eq('month', month)
    .maybeSingle()

  if (error) {
    console.error('Supabase Error:', error)
    return { success: false, error: 'Periodenstatus konnte nicht geladen werden.' }
  }
  return { success: true, data: data as PayrollPeriodDB | null, message: 'Status geladen' }
}

export async function closePayrollPeriodAction(year: number, month: number): Promise<ArbeitszeitActionResult<string>> {
  const authCheck = await requireAdminAuth()
  if (!authCheck.authorized) return authCheck.error

  const supabase = createAuthenticatedSupabaseClient(authCheck.supabaseAccessToken)
  const { data: periodId, error } = await supabase.rpc('admin_close_payroll_period', { p_year: year, p_month: month })

  if (error) {
    console.error('Supabase RPC Error:', error)
    const reason =
      error.message?.includes('open_entries_remaining')
        ? 'Abschluss erst möglich, wenn alle Einträge genehmigt sind.'
        : error.message?.includes('missing_rate_agreement')
          ? 'Abschluss blockiert: mindestens ein genehmigter Eintrag hat keine gültige Lohnvereinbarung.'
          : error.message?.includes('period_already_locked')
            ? 'Diese Periode ist bereits abgeschlossen.'
            : 'Monat konnte nicht abgeschlossen werden.'
    return { success: false, error: reason }
  }

  revalidatePath('/dashboard/arbeitszeiten')
  return { success: true, data: periodId as string, message: 'Monat erfolgreich abgeschlossen.' }
}
