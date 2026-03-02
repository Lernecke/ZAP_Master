'use server'

import { createAuthenticatedSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { auth } from '@/lib/auth/config'
import { revalidatePath } from 'next/cache'

export type TeacherEssayResult<T = void> = 
  | { success: true; data?: T; message?: string }
  | { success: false; error: string }

export interface EssayWithStudent {
  id: string
  student_id: string
  title: string
  description: string | null
  file_path: string
  file_name: string
  file_size: number
  file_type: string
  subject: string
  status: 'draft' | 'submitted' | 'in_korrektur' | 'reviewed' | 'returned'
  feedback: string | null
  grade: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
  // Joined student data
  student: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string | null
    class_level: string | null
  } | null
}

/**
 * Prüft ob User Lehrperson oder Admin ist
 */
async function requireTeacherAuth(): Promise<
  | { authenticated: true; userId: string; supabaseAccessToken: string; role: string }
  | { authenticated: false; error: TeacherEssayResult }
> {
  const session = await auth()
  
  if (!session?.user?.id || !session.supabaseAccessToken) {
    return {
      authenticated: false,
      error: { success: false, error: 'Du musst angemeldet sein.' }
    }
  }
  
  if (session.user.role !== 'lehrperson' && session.user.role !== 'admin') {
    return {
      authenticated: false,
      error: { success: false, error: 'Nur Lehrpersonen haben Zugriff auf diese Funktion.' }
    }
  }
  
  return {
    authenticated: true,
    userId: session.user.id,
    supabaseAccessToken: session.supabaseAccessToken,
    role: session.user.role
  }
}

/**
 * Lädt alle eingereichten Aufsätze für Lehrpersonen
 * Filtert draft-Status aus (nur submitted, in_korrektur, reviewed, returned)
 */
export async function getAllSubmittedEssays(
  filters?: {
    status?: string
    subject?: string
    classLevel?: string
  }
): Promise<TeacherEssayResult<EssayWithStudent[]>> {
  const authCheck = await requireTeacherAuth()
  if (!authCheck.authenticated) return authCheck.error as TeacherEssayResult<EssayWithStudent[]>
  
  const supabase = createAuthenticatedSupabaseClient(authCheck.supabaseAccessToken)
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('student_essays')
    .select(`
      *,
      student:profiles!student_essays_student_id_fkey (
        id,
        first_name,
        last_name,
        email,
        class_level
      )
    `)
    .neq('status', 'draft') // Keine Entwürfe anzeigen
    .order('created_at', { ascending: false })
  
  // Filter anwenden
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.subject) {
    query = query.eq('subject', filters.subject)
  }
  if (filters?.classLevel) {
    query = query.eq('student.class_level', filters.classLevel)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('Fetch essays error:', error)
    return { success: false, error: 'Aufsätze konnten nicht geladen werden.' }
  }
  
  return { success: true, data: data as EssayWithStudent[] }
}

/**
 * Lädt einen einzelnen Aufsatz mit Details
 */
export async function getEssayById(essayId: string): Promise<TeacherEssayResult<EssayWithStudent>> {
  const authCheck = await requireTeacherAuth()
  if (!authCheck.authenticated) return authCheck.error as TeacherEssayResult<EssayWithStudent>
  
  const supabase = createAuthenticatedSupabaseClient(authCheck.supabaseAccessToken)
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('student_essays')
    .select(`
      *,
      student:profiles!student_essays_student_id_fkey (
        id,
        first_name,
        last_name,
        email,
        class_level
      )
    `)
    .eq('id', essayId)
    .neq('status', 'draft')
    .single()
  
  if (error) {
    console.error('Fetch essay error:', error)
    return { success: false, error: 'Aufsatz nicht gefunden.' }
  }
  
  return { success: true, data: data as EssayWithStudent }
}

/**
 * Setzt den Status auf "in_korrektur" (Lehrer beginnt Korrektur)
 */
export async function startReview(essayId: string): Promise<TeacherEssayResult> {
  const authCheck = await requireTeacherAuth()
  if (!authCheck.authenticated) return authCheck.error
  
  const supabase = createAuthenticatedSupabaseClient(authCheck.supabaseAccessToken)
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('student_essays')
    .update({ 
      status: 'in_korrektur',
      reviewed_by: authCheck.userId,
      updated_at: new Date().toISOString()
    })
    .eq('id', essayId)
    .eq('status', 'submitted') // Nur wenn noch nicht in Korrektur
  
  if (error) {
    console.error('Start review error:', error)
    return { success: false, error: 'Status konnte nicht geändert werden.' }
  }
  
  revalidatePath('/dashboard/aufsaetze')
  return { success: true, message: 'Korrektur gestartet.' }
}

/**
 * Speichert die Bewertung eines Aufsatzes
 */
export async function gradeEssay(
  essayId: string,
  grading: {
    grade: string
    feedback: string
    returnToStudent?: boolean
  }
): Promise<TeacherEssayResult> {
  const authCheck = await requireTeacherAuth()
  if (!authCheck.authenticated) return authCheck.error
  
  if (!grading.grade && !grading.feedback) {
    return { success: false, error: 'Bitte Note oder Feedback angeben.' }
  }
  
  const supabase = createAuthenticatedSupabaseClient(authCheck.supabaseAccessToken)
  
  const updateData = {
    grade: grading.grade || null,
    feedback: grading.feedback || null,
    status: grading.returnToStudent ? 'returned' : 'reviewed',
    reviewed_by: authCheck.userId,
    reviewed_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('student_essays')
    .update(updateData)
    .eq('id', essayId)
    .in('status', ['submitted', 'in_korrektur']) // Nur offene Aufsätze
  
  if (error) {
    console.error('Grade essay error:', error)
    return { success: false, error: 'Bewertung konnte nicht gespeichert werden.' }
  }
  
  revalidatePath('/dashboard/aufsaetze')
  revalidatePath('/aufsaetze') // Auch Schüler-View aktualisieren
  return { 
    success: true, 
    message: grading.returnToStudent 
      ? 'Aufsatz bewertet und an Schüler zurückgegeben.' 
      : 'Bewertung gespeichert.'
  }
}

/**
 * Erstellt eine Signed URL zum Download für Lehrpersonen
 */
export async function getTeacherDownloadUrl(essayId: string): Promise<TeacherEssayResult<string>> {
  const authCheck = await requireTeacherAuth()
  if (!authCheck.authenticated) return authCheck.error as TeacherEssayResult<string>
  
  const supabase = createAuthenticatedSupabaseClient(authCheck.supabaseAccessToken)
  
  // Hole Dateipfad
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: essay, error: fetchError } = await (supabase as any)
    .from('student_essays')
    .select('file_path, file_name')
    .eq('id', essayId)
    .neq('status', 'draft')
    .single()
  
  if (fetchError || !essay) {
    return { success: false, error: 'Aufsatz nicht gefunden.' }
  }
  
  const adminSupabase = createAdminSupabaseClient()
  
  const { data, error } = await adminSupabase.storage
    .from('student-essays')
    .createSignedUrl(essay.file_path, 60 * 30) // 30 Minuten gültig für Korrektur
  
  if (error) {
    console.error('Download URL error:', error)
    return { success: false, error: 'Download-Link konnte nicht erstellt werden.' }
  }
  
  return { success: true, data: data.signedUrl }
}

/**
 * Statistiken für das Lehrer-Dashboard
 */
export async function getEssayStats(): Promise<TeacherEssayResult<{
  total: number
  submitted: number
  inReview: number
  reviewed: number
  returned: number
}>> {
  const authCheck = await requireTeacherAuth()
  if (!authCheck.authenticated) return authCheck.error as TeacherEssayResult<{
    total: number
    submitted: number
    inReview: number
    reviewed: number
    returned: number
  }>
  
  const supabase = createAuthenticatedSupabaseClient(authCheck.supabaseAccessToken)
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('student_essays')
    .select('status')
    .neq('status', 'draft')
  
  if (error) {
    console.error('Stats error:', error)
    return { success: false, error: 'Statistiken konnten nicht geladen werden.' }
  }
  
  const stats = {
    total: data.length,
    submitted: data.filter((e: { status: string }) => e.status === 'submitted').length,
    inReview: data.filter((e: { status: string }) => e.status === 'in_korrektur').length,
    reviewed: data.filter((e: { status: string }) => e.status === 'reviewed').length,
    returned: data.filter((e: { status: string }) => e.status === 'returned').length,
  }
  
  return { success: true, data: stats }
}
