'use server'

import { createAuthenticatedSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { auth } from '@/lib/auth/config'
import { revalidatePath } from 'next/cache'

// Erlaubte Dateitypen und Maximalgröße
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export type EssayResult<T = void> = 
  | { success: true; data?: T; message?: string }
  | { success: false; error: string }

export interface SignedUploadUrl {
  signedUrl: string
  path: string
  token: string
}

export interface Essay {
  id: string
  student_id: string
  title: string
  description: string | null
  file_path: string
  file_name: string
  file_size: number
  file_type: string
  subject: string
  status: 'draft' | 'submitted' | 'reviewed' | 'returned'
  feedback: string | null
  grade: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

/**
 * Prüft Authentifizierung und gibt Session-Daten zurück
 * Wiederverwendbare Auth-Logik (DRY)
 */
async function requireStudentAuth(): Promise<
  | { authenticated: true; userId: string; supabaseAccessToken: string }
  | { authenticated: false; error: EssayResult }
> {
  const session = await auth()
  
  if (!session?.user?.id || !session.supabaseAccessToken) {
    return {
      authenticated: false,
      error: { success: false, error: 'Du musst angemeldet sein.' }
    }
  }
  
  // Nur "user" Rolle (Schüler) darf Aufsätze hochladen
  if (session.user.role !== 'user') {
    return {
      authenticated: false,
      error: { success: false, error: 'Nur Schüler können Aufsätze abgeben.' }
    }
  }
  
  return {
    authenticated: true,
    userId: session.user.id,
    supabaseAccessToken: session.supabaseAccessToken
  }
}

/**
 * Schritt 4: Erstellt eine Signed URL für den direkten Upload
 * Pfad: aufsaetze/{user.id}/{uuid}--{originalname}.{ext}
 */
export async function createSignedUploadUrl(
  fileName: string,
  fileType: string,
  fileSize: number
): Promise<EssayResult<SignedUploadUrl>> {
  // Auth-Check (Schritte 1-3)
  const authCheck = await requireStudentAuth()
  if (!authCheck.authenticated) return authCheck.error as EssayResult<SignedUploadUrl>
  
  // Validierung: Dateityp
  if (!ALLOWED_MIME_TYPES.includes(fileType)) {
    return { 
      success: false, 
      error: 'Nur PDF und Word-Dokumente (.pdf, .doc, .docx) sind erlaubt.' 
    }
  }
  
  // Validierung: Dateigröße
  if (fileSize > MAX_FILE_SIZE) {
    return { 
      success: false, 
      error: 'Die Datei ist zu gross. Maximale Grösse: 10MB.' 
    }
  }
  
  // Dateiname sanitieren
  const sanitizedName = fileName
    .replace(/[^a-zA-Z0-9äöüÄÖÜß._-]/g, '_')
    .substring(0, 100)
  
  // Unique ID für Dateinamen
  const uniqueId = crypto.randomUUID()
  
  // Pfad: aufsaetze/{user.id}/{uuid}--{originalname}
  const filePath = `aufsaetze/${authCheck.userId}/${uniqueId}--${sanitizedName}`
  
  // Admin-Client für Signed URL (umgeht RLS für Storage-Admin-Operationen)
  const adminSupabase = createAdminSupabaseClient()
  
  const { data, error } = await adminSupabase.storage
    .from('student-essays')
    .createSignedUploadUrl(filePath)
  
  if (error) {
    console.error('Signed URL creation error:', error)
    return { success: false, error: 'Konnte Upload-URL nicht erstellen.' }
  }
  
  return {
    success: true,
    data: {
      signedUrl: data.signedUrl,
      path: filePath,
      token: data.token
    }
  }
}

/**
 * Schritt 6: Speichert Metadaten nach erfolgreichem Upload
 */
export async function saveEssayMetadata(
  filePath: string,
  fileName: string,
  fileSize: number,
  fileType: string,
  title: string,
  subject: string,
  description?: string,
  submitImmediately?: boolean
): Promise<EssayResult<Essay>> {
  const authCheck = await requireStudentAuth()
  if (!authCheck.authenticated) return authCheck.error as EssayResult<Essay>
  
  const supabase = createAuthenticatedSupabaseClient(authCheck.supabaseAccessToken)
  
  // Prüfe ob der Pfad zum User gehört (Security)
  if (!filePath.startsWith(`aufsaetze/${authCheck.userId}/`)) {
    return { success: false, error: 'Ungültiger Dateipfad.' }
  }
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('student_essays')
    .insert({
      student_id: authCheck.userId,
      title,
      description: description || null,
      file_path: filePath,
      file_name: fileName,
      file_size: fileSize,
      file_type: fileType,
      subject,
      status: submitImmediately ? 'submitted' : 'draft'
    })
    .select()
    .single()
  
  if (error) {
    console.error('Essay metadata save error:', error)
    return { success: false, error: 'Metadaten konnten nicht gespeichert werden.' }
  }
  
  revalidatePath('/aufsaetze')
  
  return {
    success: true,
    data: data as Essay,
    message: submitImmediately 
      ? 'Aufsatz erfolgreich eingereicht!' 
      : 'Aufsatz als Entwurf gespeichert.'
  }
}

/**
 * Lädt alle Aufsätze des aktuellen Schülers
 */
export async function getMyEssays(): Promise<EssayResult<Essay[]>> {
  const authCheck = await requireStudentAuth()
  if (!authCheck.authenticated) return authCheck.error as EssayResult<Essay[]>
  
  const supabase = createAuthenticatedSupabaseClient(authCheck.supabaseAccessToken)
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('student_essays')
    .select('*')
    .eq('student_id', authCheck.userId)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Fetch essays error:', error)
    return { success: false, error: 'Aufsätze konnten nicht geladen werden.' }
  }
  
  return { success: true, data: data as Essay[] }
}

/**
 * Aktualisiert einen Aufsatz (nur Entwürfe)
 */
export async function updateEssay(
  essayId: string,
  updates: {
    title?: string
    description?: string
    subject?: string
  }
): Promise<EssayResult> {
  const authCheck = await requireStudentAuth()
  if (!authCheck.authenticated) return authCheck.error
  
  const supabase = createAuthenticatedSupabaseClient(authCheck.supabaseAccessToken)
  
  // Prüfe Status (nur Entwürfe editierbar)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing, error: fetchError } = await (supabase as any)
    .from('student_essays')
    .select('status')
    .eq('id', essayId)
    .eq('student_id', authCheck.userId)
    .single()
  
  if (fetchError || !existing) {
    return { success: false, error: 'Aufsatz nicht gefunden.' }
  }
  
  if (existing.status !== 'draft') {
    return { success: false, error: 'Nur Entwürfe können bearbeitet werden.' }
  }
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('student_essays')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', essayId)
    .eq('student_id', authCheck.userId)
  
  if (error) {
    console.error('Update essay error:', error)
    return { success: false, error: 'Aufsatz konnte nicht aktualisiert werden.' }
  }
  
  revalidatePath('/aufsaetze')
  return { success: true, message: 'Änderungen gespeichert.' }
}

/**
 * Reicht einen Entwurf ein
 */
export async function submitEssay(essayId: string): Promise<EssayResult> {
  const authCheck = await requireStudentAuth()
  if (!authCheck.authenticated) return authCheck.error
  
  const supabase = createAuthenticatedSupabaseClient(authCheck.supabaseAccessToken)
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('student_essays')
    .update({ 
      status: 'submitted',
      updated_at: new Date().toISOString()
    })
    .eq('id', essayId)
    .eq('student_id', authCheck.userId)
    .eq('status', 'draft') // Nur Entwürfe
  
  if (error) {
    console.error('Submit essay error:', error)
    return { success: false, error: 'Aufsatz konnte nicht eingereicht werden.' }
  }
  
  revalidatePath('/aufsaetze')
  return { success: true, message: 'Aufsatz erfolgreich eingereicht!' }
}

/**
 * Löscht einen Entwurf (inkl. Datei)
 */
export async function deleteEssay(essayId: string): Promise<EssayResult> {
  const authCheck = await requireStudentAuth()
  if (!authCheck.authenticated) return authCheck.error
  
  const supabase = createAuthenticatedSupabaseClient(authCheck.supabaseAccessToken)
  const adminSupabase = createAdminSupabaseClient()
  
  // Hole Datei-Pfad und prüfe Status
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: essay, error: fetchError } = await (supabase as any)
    .from('student_essays')
    .select('file_path, status')
    .eq('id', essayId)
    .eq('student_id', authCheck.userId)
    .single()
  
  if (fetchError || !essay) {
    return { success: false, error: 'Aufsatz nicht gefunden.' }
  }
  
  if (essay.status !== 'draft') {
    return { success: false, error: 'Nur Entwürfe können gelöscht werden.' }
  }
  
  // Lösche Datei aus Storage (Admin-Client für volle Berechtigung)
  const { error: storageError } = await adminSupabase.storage
    .from('student-essays')
    .remove([essay.file_path])
  
  if (storageError) {
    console.error('Storage delete error:', storageError)
    // Fahre trotzdem fort mit DB-Löschung
  }
  
  // Lösche aus Datenbank
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('student_essays')
    .delete()
    .eq('id', essayId)
    .eq('student_id', authCheck.userId)
  
  if (error) {
    console.error('Delete essay error:', error)
    return { success: false, error: 'Aufsatz konnte nicht gelöscht werden.' }
  }
  
  revalidatePath('/aufsaetze')
  return { success: true, message: 'Entwurf gelöscht.' }
}

/**
 * Erstellt eine Signed URL zum Download einer Datei
 */
export async function getEssayDownloadUrl(essayId: string): Promise<EssayResult<string>> {
  const authCheck = await requireStudentAuth()
  if (!authCheck.authenticated) return authCheck.error as EssayResult<string>
  
  const supabase = createAuthenticatedSupabaseClient(authCheck.supabaseAccessToken)
  
  // Hole Dateipfad
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: essay, error: fetchError } = await (supabase as any)
    .from('student_essays')
    .select('file_path')
    .eq('id', essayId)
    .eq('student_id', authCheck.userId)
    .single()
  
  if (fetchError || !essay) {
    return { success: false, error: 'Aufsatz nicht gefunden.' }
  }
  
  const adminSupabase = createAdminSupabaseClient()
  
  const { data, error } = await adminSupabase.storage
    .from('student-essays')
    .createSignedUrl(essay.file_path, 60 * 5) // 5 Minuten gültig
  
  if (error) {
    console.error('Download URL error:', error)
    return { success: false, error: 'Download-Link konnte nicht erstellt werden.' }
  }
  
  return { success: true, data: data.signedUrl }
}
