'use server'

import { createAuthenticatedSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { auth } from '@/lib/auth/config'
import { revalidatePath } from 'next/cache'
import { createStructuredRubricSchema } from '@/types/aufsatz'
import { createBucketSignedUploadUrl } from '@/lib/storage/signed-upload'

export type RubrikResult<T = void> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> }

export interface RubricCriterion {
  id: string
  name: string
  max_points?: number
  description: string
}

export interface Rubric {
  id: string
  title: string
  subject: string | null
  type: 'pdf' | 'structured'
  pdf_path: string | null
  pdf_name: string | null
  criteria: { criteria: RubricCriterion[] } | null
  max_points: number | null
  description: string | null
  created_by: string
  created_at: string
  updated_at: string
}

async function requireTeacherAuth() {
  const session = await auth()
  if (!session?.user?.id || !session.supabaseAccessToken) {
    return { authenticated: false as const, error: { success: false as const, error: 'Nicht angemeldet.' } }
  }
  if (session.user.role !== 'lehrperson' && session.user.role !== 'admin') {
    return { authenticated: false as const, error: { success: false as const, error: 'Nur Lehrpersonen haben Zugriff.' } }
  }
  return {
    authenticated: true as const,
    userId: session.user.id,
    supabaseAccessToken: session.supabaseAccessToken,
  }
}

// ── LESEN ──────────────────────────────────────────────────────

export async function getRubrics(subject?: string): Promise<RubrikResult<Rubric[]>> {
  const auth = await requireTeacherAuth()
  if (!auth.authenticated) return auth.error as RubrikResult<Rubric[]>

  const supabase = createAuthenticatedSupabaseClient(auth.supabaseAccessToken)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('correction_rubrics')
    .select('*')
    .order('created_at', { ascending: false })

  if (subject) {
    query = query.or(`subject.eq.${subject},subject.is.null`)
  }

  const { data, error } = await query

  if (error) {
    console.error('getRubrics error:', error)
    return { success: false, error: 'Rubriken konnten nicht geladen werden.' }
  }

  return { success: true, data: data as Rubric[] }
}

// ── PDF-UPLOAD: SIGNED URL ─────────────────────────────────────

export async function createSignedRubricUploadUrl(
  fileName: string,
  fileSize: number
): Promise<RubrikResult<{ signedUrl: string; path: string }>> {
  const auth = await requireTeacherAuth()
  if (!auth.authenticated) return auth.error as RubrikResult<{ signedUrl: string; path: string }>

  if (fileSize > 5 * 1024 * 1024) {
    return { success: false, error: 'Datei zu gross (max. 5 MB).' }
  }

  const result = await createBucketSignedUploadUrl({
    bucket: 'correction-rubrics',
    pathPrefix: 'rubriken',
    userId: auth.userId,
    fileName,
    errorLogLabel: 'createSignedRubricUploadUrl error',
    errorMessage: 'Upload-URL konnte nicht erstellt werden.',
  })

  if (!result.success) return result

  return { success: true, data: { signedUrl: result.data.signedUrl, path: result.data.path } }
}

// ── ERSTELLEN ──────────────────────────────────────────────────

export async function saveRubricPdf(
  pdfPath: string,
  pdfName: string,
  title: string,
  subject?: string
): Promise<RubrikResult<Rubric>> {
  const auth = await requireTeacherAuth()
  if (!auth.authenticated) return auth.error as RubrikResult<Rubric>

  if (!pdfPath.startsWith(`rubriken/${auth.userId}/`)) {
    return { success: false, error: 'Ungültiger Dateipfad.' }
  }

  const supabase = createAuthenticatedSupabaseClient(auth.supabaseAccessToken)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('correction_rubrics')
    .insert({
      title,
      subject: subject || null,
      type: 'pdf',
      pdf_path: pdfPath,
      pdf_name: pdfName,
      created_by: auth.userId,
    })
    .select()
    .single()

  if (error) {
    console.error('saveRubricPdf error:', error)
    return { success: false, error: 'Rubrik konnte nicht gespeichert werden.' }
  }

  revalidatePath('/dashboard/aufsaetze/rubriken')
  return { success: true, data: data as Rubric, message: 'Rubrik gespeichert.' }
}

export async function createStructuredRubric(
  title: string,
  criteria: RubricCriterion[],
  subject?: string,
  description?: string
): Promise<RubrikResult<Rubric>> {
  const auth = await requireTeacherAuth()
  if (!auth.authenticated) return auth.error as RubrikResult<Rubric>

  const parsed = createStructuredRubricSchema.safeParse({ title, criteria })
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Validierungsfehler',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const maxPoints = criteria.reduce((sum, c) => sum + (c.max_points ?? 0), 0)

  const supabase = createAuthenticatedSupabaseClient(auth.supabaseAccessToken)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('correction_rubrics')
    .insert({
      title: parsed.data.title,
      subject: subject || null,
      type: 'structured',
      criteria: { criteria }, // Use original criteria to preserve id and max_points
      max_points: maxPoints > 0 ? maxPoints : null,
      description: description || null,
      created_by: auth.userId,
    })
    .select()
    .single()

  if (error) {
    console.error('createStructuredRubric error:', error)
    return { success: false, error: 'Rubrik konnte nicht erstellt werden.' }
  }

  revalidatePath('/dashboard/aufsaetze/rubriken')
  return { success: true, data: data as Rubric, message: 'Rubrik erstellt.' }
}

// ── LÖSCHEN ────────────────────────────────────────────────────

export async function deleteRubric(rubricId: string): Promise<RubrikResult> {
  const auth = await requireTeacherAuth()
  if (!auth.authenticated) return auth.error

  const supabase = createAuthenticatedSupabaseClient(auth.supabaseAccessToken)
  const adminSupabase = createAdminSupabaseClient()

  // Rubrik laden um evtl. PDF zu löschen
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rubric } = await (supabase as any)
    .from('correction_rubrics')
    .select('type, pdf_path, created_by')
    .eq('id', rubricId)
    .single()

  if (!rubric) return { success: false, error: 'Rubrik nicht gefunden.' }
  if (rubric.created_by !== auth.userId) return { success: false, error: 'Keine Berechtigung.' }

  // PDF aus Storage löschen
  if (rubric.type === 'pdf' && rubric.pdf_path) {
    await adminSupabase.storage.from('correction-rubrics').remove([rubric.pdf_path])
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('correction_rubrics')
    .delete()
    .eq('id', rubricId)
    .eq('created_by', auth.userId)

  if (error) {
    console.error('deleteRubric error:', error)
    return { success: false, error: 'Rubrik konnte nicht gelöscht werden.' }
  }

  revalidatePath('/dashboard/aufsaetze/rubriken')
  return { success: true, message: 'Rubrik gelöscht.' }
}
