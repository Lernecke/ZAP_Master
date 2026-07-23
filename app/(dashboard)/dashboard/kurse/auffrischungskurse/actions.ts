'use server'

// Admin-Maske für die von ZAP/Gymiprüfung komplett getrennten Auffrischungs-/Intensivkurse
// (courses/course_occurrences) -- mirrort den Aufbau von
// app/(dashboard)/dashboard/kurse/durchfuehrungen/actions.ts (neueres, admin-only Muster:
// requireAdminAuth()-Closure, writeAuditLog()-Helper, createAuthenticatedSupabaseClient() statt
// Service-Role, damit Mutationen an dieselbe RLS-Kette gebunden bleiben wie jede andere
// Nutzeraktion). Kein version-Feld auf diesen Tabellen -- keine Optimistic-Concurrency nötig für
// dieses kleine, admin-only Tool.

import { createAuthenticatedSupabaseClient } from '@/lib/supabase/server'
import { auth } from '@/lib/auth/config'
import { revalidatePath } from 'next/cache'
import {
  courseFormSchema,
  occurrenceFormSchema,
  type CourseFormInput,
  type OccurrenceFormInput,
  type CourseDB,
  type CourseOccurrenceDB,
  type ActionResult,
} from '@/types/auffrischungskurs'

async function requireAdminAuth(): Promise<
  | { authorized: true; userId: string; supabaseAccessToken: string }
  | { authorized: false; error: ActionResult<never> }
> {
  const session = await auth()
  if (!session?.user || !session.supabaseAccessToken) {
    return { authorized: false, error: { success: false, error: 'Du musst angemeldet sein, um diese Aktion auszuführen.' } }
  }
  if (session.user.role !== 'admin') {
    return { authorized: false, error: { success: false, error: 'Nur Administratorinnen und Administratoren dürfen Auffrischungs-/Intensivkurse verwalten.' } }
  }
  return { authorized: true, userId: session.user.id, supabaseAccessToken: session.supabaseAccessToken }
}

async function writeAuditLog(
  supabase: ReturnType<typeof createAuthenticatedSupabaseClient>,
  actorUserId: string,
  entityType: string,
  entityId: string,
  action: string,
  before: unknown,
  after: unknown
) {
  const { error } = await supabase
    .from('audit_log')
    .insert({
      actor_user_id: actorUserId,
      entity_type: entityType,
      entity_id: entityId,
      action,
      diff: JSON.parse(JSON.stringify({ before, after })),
    })
  if (error) {
    console.error('audit_log insert failed', error)
  }
}

export async function getCourses(): Promise<ActionResult<CourseDB[]>> {
  const authCheck = await requireAdminAuth()
  if (!authCheck.authorized) return authCheck.error

  const supabase = createAuthenticatedSupabaseClient(authCheck.supabaseAccessToken)
  const { data, error } = await supabase.from('courses').select('*').order('created_at', { ascending: false })

  if (error) {
    console.error('Supabase Error:', error)
    return { success: false, error: 'Kurse konnten nicht geladen werden.' }
  }

  return { success: true, data: data as CourseDB[], message: 'Kurse geladen' }
}

export async function getCourseDetail(
  id: number
): Promise<ActionResult<{ course: CourseDB; occurrences: CourseOccurrenceDB[] }>> {
  const authCheck = await requireAdminAuth()
  if (!authCheck.authorized) return authCheck.error

  const supabase = createAuthenticatedSupabaseClient(authCheck.supabaseAccessToken)

  const { data: course, error: courseError } = await supabase.from('courses').select('*').eq('id', id).single()
  if (courseError || !course) {
    return { success: false, error: 'Kurs nicht gefunden.' }
  }

  const { data: occurrences, error: occurrencesError } = await supabase
    .from('course_occurrences')
    .select('*')
    .eq('course_id', id)
    .order('starts_at_utc', { ascending: true })

  if (occurrencesError) {
    console.error('Supabase Error:', occurrencesError)
    return { success: false, error: 'Termine konnten nicht geladen werden.' }
  }

  return {
    success: true,
    data: { course: course as CourseDB, occurrences: (occurrences ?? []) as CourseOccurrenceDB[] },
    message: 'Kurs geladen',
  }
}

export async function saveCourseAction(
  id: number | null,
  input: CourseFormInput
): Promise<ActionResult<CourseDB>> {
  const authCheck = await requireAdminAuth()
  if (!authCheck.authorized) return authCheck.error

  const parsed = courseFormSchema.safeParse(input)
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {}
    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0] as string
      if (!fieldErrors[field]) fieldErrors[field] = []
      fieldErrors[field].push(issue.message)
    })
    return { success: false, error: 'Bitte überprüfe deine Eingaben.', fieldErrors }
  }

  const data = parsed.data
  const supabase = createAuthenticatedSupabaseClient(authCheck.supabaseAccessToken)
  const payload = {
    title: data.title,
    description: data.description,
    price: data.priceChf,
    location: data.location,
    payment_method: data.paymentMethod,
    // Alle vier Bestandszeilen verwenden Europe/Zurich -- kein Formularfeld, da es keinen Grund
    // gibt, das für neue Zeilen abweichen zu lassen.
    timezone: 'Europe/Zurich',
  }

  if (id === null) {
    const { data: created, error } = await supabase.from('courses').insert(payload).select().single()

    if (error) {
      console.error('Supabase Error:', error)
      return { success: false, error: 'Kurs konnte nicht erstellt werden.' }
    }

    await writeAuditLog(supabase, authCheck.userId, 'course', String(created.id), 'create', null, created)
    revalidatePath('/dashboard/kurse/auffrischungskurse')
    return { success: true, data: created as CourseDB, message: 'Kurs erstellt.' }
  }

  const { data: updated, error } = await supabase.from('courses').update(payload).eq('id', id).select().single()

  if (error || !updated) {
    console.error('Supabase Error:', error)
    return { success: false, error: 'Kurs konnte nicht gespeichert werden.' }
  }

  await writeAuditLog(supabase, authCheck.userId, 'course', String(id), 'update', null, updated)
  revalidatePath('/dashboard/kurse/auffrischungskurse')
  revalidatePath(`/dashboard/kurse/auffrischungskurse/${id}`)
  return { success: true, data: updated as CourseDB, message: 'Kurs gespeichert.' }
}

export async function deleteCourseAction(id: number): Promise<ActionResult> {
  const authCheck = await requireAdminAuth()
  if (!authCheck.authorized) return authCheck.error

  const supabase = createAuthenticatedSupabaseClient(authCheck.supabaseAccessToken)
  const { error } = await supabase.from('courses').delete().eq('id', id)

  if (error) {
    // 23503 = foreign_key_violation -- course_occurrences.course_id hat kein ON DELETE CASCADE.
    if (error.code === '23503') {
      return { success: false, error: 'Dieser Kurs hat noch Termine. Bitte zuerst alle Termine entfernen.' }
    }
    console.error('Supabase Error:', error)
    return { success: false, error: 'Kurs konnte nicht gelöscht werden.' }
  }

  await writeAuditLog(supabase, authCheck.userId, 'course', String(id), 'delete', null, null)
  revalidatePath('/dashboard/kurse/auffrischungskurse')
  return { success: true, message: 'Kurs gelöscht.' }
}

export async function saveOccurrenceAction(
  courseId: number,
  occurrenceId: number | null,
  input: OccurrenceFormInput
): Promise<ActionResult<CourseOccurrenceDB>> {
  const authCheck = await requireAdminAuth()
  if (!authCheck.authorized) return authCheck.error

  const parsed = occurrenceFormSchema.safeParse(input)
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {}
    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0] as string
      if (!fieldErrors[field]) fieldErrors[field] = []
      fieldErrors[field].push(issue.message)
    })
    return { success: false, error: 'Bitte überprüfe deine Eingaben.', fieldErrors }
  }

  const data = parsed.data
  const supabase = createAuthenticatedSupabaseClient(authCheck.supabaseAccessToken)
  const payload = {
    starts_at_utc: new Date(data.startsAt).toISOString(),
    ends_at_utc: new Date(data.endsAt).toISOString(),
    course_id: courseId,
  }

  if (occurrenceId === null) {
    const { data: created, error } = await supabase.from('course_occurrences').insert(payload).select().single()

    if (error) {
      console.error('Supabase Error:', error)
      return { success: false, error: 'Termin konnte nicht erstellt werden.' }
    }

    await writeAuditLog(supabase, authCheck.userId, 'course_occurrence', String(created.id), 'create', null, created)
    revalidatePath(`/dashboard/kurse/auffrischungskurse/${courseId}`)
    return { success: true, data: created as CourseOccurrenceDB, message: 'Termin hinzugefügt.' }
  }

  const { data: updated, error } = await supabase
    .from('course_occurrences')
    .update(payload)
    .eq('id', occurrenceId)
    .select()
    .single()

  if (error || !updated) {
    console.error('Supabase Error:', error)
    return { success: false, error: 'Termin konnte nicht gespeichert werden.' }
  }

  await writeAuditLog(supabase, authCheck.userId, 'course_occurrence', String(occurrenceId), 'update', null, updated)
  revalidatePath(`/dashboard/kurse/auffrischungskurse/${courseId}`)
  return { success: true, data: updated as CourseOccurrenceDB, message: 'Termin gespeichert.' }
}

export async function deleteOccurrenceAction(courseId: number, occurrenceId: number): Promise<ActionResult> {
  const authCheck = await requireAdminAuth()
  if (!authCheck.authorized) return authCheck.error

  const supabase = createAuthenticatedSupabaseClient(authCheck.supabaseAccessToken)
  const { error } = await supabase.from('course_occurrences').delete().eq('id', occurrenceId)

  if (error) {
    console.error('Supabase Error:', error)
    return { success: false, error: 'Termin konnte nicht gelöscht werden.' }
  }

  await writeAuditLog(supabase, authCheck.userId, 'course_occurrence', String(occurrenceId), 'delete', null, null)
  revalidatePath(`/dashboard/kurse/auffrischungskurse/${courseId}`)
  return { success: true, message: 'Termin gelöscht.' }
}
