'use server'

import { createAuthenticatedSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { auth } from '@/lib/auth/config'
import { revalidatePath } from 'next/cache'
import { anthropic, AI_MODEL, AI_MAX_TOKENS } from '@/lib/ai/client'
import { buildCorrectionPrompt, buildQuickCorrectionPrompt, formatStructuredRubric } from '@/lib/ai/prompts'
import { extractTextFromBuffer } from '@/lib/utils/extractEssayText'
import { gradeEssaySchema } from '@/types/aufsatz'

export type TeacherEssayResult<T = void> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> }

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
      student:user!student_essays_student_id_fkey (
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
      student:user!student_essays_student_id_fkey (
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

  const parsed = gradeEssaySchema.safeParse({
    grade: grading.grade !== '' ? Number(grading.grade) : undefined,
    feedback: grading.feedback !== '' ? grading.feedback : undefined,
  })
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Validierungsfehler',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const supabase = createAuthenticatedSupabaseClient(authCheck.supabaseAccessToken)

  const updateData = {
    grade: parsed.data.grade?.toString() ?? null,
    feedback: parsed.data.feedback ?? null,
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

// ════════════════════════════════════════════════════════════
// KI-KORREKTUR ACTIONS
// ════════════════════════════════════════════════════════════

export interface AiCorrection {
  id: string
  essay_id: string
  rubric_id: string | null
  raw_suggestion: string
  teacher_edited_suggestion: string | null
  status: 'generating' | 'ready' | 'released'
  model_used: string
  input_tokens: number | null
  output_tokens: number | null
  generated_at: string
  released_at: string | null
  released_by: string | null
}

/**
 * Generiert einen KI-Korrekturvorschlag für einen Aufsatz.
 * Entweder anhand eines Bewertungsrasters (rubricId) oder anhand von Schnell-Kriterien (quickCriteria).
 */
export async function generateAiCorrection(
  essayId: string,
  options: { rubricId?: string; quickCriteria?: string[] }
): Promise<TeacherEssayResult<{ correctionId: string }>> {
  const authCheck = await requireTeacherAuth()
  if (!authCheck.authenticated) return authCheck.error as TeacherEssayResult<{ correctionId: string }>

  const { rubricId, quickCriteria } = options

  if (!rubricId && (!quickCriteria || quickCriteria.length === 0)) {
    return { success: false, error: 'Bitte ein Bewertungsraster auswählen oder mindestens ein Kriterium aktivieren.' }
  }

  const supabase = createAuthenticatedSupabaseClient(authCheck.supabaseAccessToken)
  const adminSupabase = createAdminSupabaseClient()

  // 1. Essay laden
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: essay, error: essayError } = await (supabase as any)
    .from('student_essays')
    .select('*, student:user!student_essays_student_id_fkey(class_level)')
    .eq('id', essayId)
    .neq('status', 'draft')
    .single()

  if (essayError || !essay) {
    return { success: false, error: 'Aufsatz nicht gefunden.' }
  }

  // 2. Rubrik laden (nur wenn angegeben)
  let rubric = null
  if (rubricId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: rubricError } = await (supabase as any)
      .from('correction_rubrics')
      .select('*')
      .eq('id', rubricId)
      .single()

    if (rubricError || !data) {
      return { success: false, error: 'Bewertungsraster nicht gefunden.' }
    }
    rubric = data
  }

  // 3. Vorhandene Korrektur löschen (falls Neuversuch)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminSupabase as any)
    .from('essay_ai_corrections')
    .delete()
    .eq('essay_id', essayId)

  // 4. Placeholder mit Status 'generating' einfügen
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminSupabase as any)
    .from('essay_ai_corrections')
    .insert({
      essay_id: essayId,
      rubric_id: rubricId ?? null,
      raw_suggestion: '',
      status: 'generating',
      model_used: AI_MODEL,
    })

  try {
    // 5. Aufsatz-Datei aus Storage laden
    const { data: fileData, error: storageError } = await adminSupabase.storage
      .from('student-essays')
      .download(essay.file_path)

    if (storageError || !fileData) {
      throw new Error('Datei konnte nicht aus Storage geladen werden.')
    }

    const buffer = Buffer.from(await fileData.arrayBuffer())
    const { text: essayText, wordCount } = await extractTextFromBuffer(buffer, essay.file_type)

    if (!essayText || wordCount < 10) {
      throw new Error('Kein lesbarer Text gefunden. Das PDF könnte gescannt oder passwortgeschützt sein.')
    }

    // 6. Prompt bauen
    let prompt: string
    if (rubric) {
      // Mit Bewertungsraster
      let rubricContent: string
      if (rubric.type === 'structured' && rubric.criteria) {
        rubricContent = formatStructuredRubric(rubric.criteria)
      } else if (rubric.type === 'pdf' && rubric.pdf_path) {
        const { data: rubricFile, error: rubricStorageError } = await adminSupabase.storage
          .from('correction-rubrics')
          .download(rubric.pdf_path)

        if (rubricStorageError || !rubricFile) {
          throw new Error('Bewertungsraster-PDF konnte nicht geladen werden.')
        }

        const rubricBuffer = Buffer.from(await rubricFile.arrayBuffer())
        const { text } = await extractTextFromBuffer(rubricBuffer, 'application/pdf')
        rubricContent = text
      } else {
        throw new Error('Bewertungsraster hat kein gültiges Format.')
      }

      prompt = buildCorrectionPrompt({
        essayText,
        rubricContent,
        rubricType: rubric.type,
        essayTitle: essay.title,
        subject: essay.subject,
        classLevel: essay.student?.class_level,
      })
    } else {
      // Ohne Bewertungsraster: Schnell-Kriterien
      prompt = buildQuickCorrectionPrompt({
        essayText,
        criteria: quickCriteria ?? [],
        essayTitle: essay.title,
        subject: essay.subject,
        classLevel: essay.student?.class_level,
      })
    }

    // 7. Claude aufrufen
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: AI_MAX_TOKENS,
      messages: [{ role: 'user', content: prompt }],
      stream: false,
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const responseAny = response as any
    const suggestion: string =
      Array.isArray(responseAny.content) && responseAny.content[0]?.type === 'text'
        ? responseAny.content[0].text
        : ''

    // 8. Ergebnis in DB speichern
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminSupabase as any)
      .from('essay_ai_corrections')
      .update({
        raw_suggestion: suggestion,
        teacher_edited_suggestion: suggestion,
        status: 'ready',
        model_used: AI_MODEL,
        input_tokens: responseAny.usage?.input_tokens ?? null,
        output_tokens: responseAny.usage?.output_tokens ?? null,
        generated_at: new Date().toISOString(),
      })
      .eq('essay_id', essayId)

    revalidatePath('/dashboard/aufsaetze')
    return { success: true, data: { correctionId: essayId }, message: 'KI-Korrekturvorschlag generiert.' }

  } catch (err) {
    // Bei Fehler: Placeholder-Eintrag löschen
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminSupabase as any)
      .from('essay_ai_corrections')
      .delete()
      .eq('essay_id', essayId)

    const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
    console.error('generateAiCorrection error:', err)
    return { success: false, error: `KI-Korrektur fehlgeschlagen: ${message}` }
  }
}

/**
 * Lädt den KI-Korrekturvorschlag für einen Aufsatz.
 */
export async function getAiCorrection(essayId: string): Promise<TeacherEssayResult<AiCorrection>> {
  const authCheck = await requireTeacherAuth()
  if (!authCheck.authenticated) return authCheck.error as TeacherEssayResult<AiCorrection>

  const supabase = createAuthenticatedSupabaseClient(authCheck.supabaseAccessToken)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('essay_ai_corrections')
    .select('*')
    .eq('essay_id', essayId)
    .single()

  if (error) return { success: false, error: 'Kein KI-Vorschlag vorhanden.' }

  return { success: true, data: data as AiCorrection }
}

/**
 * Speichert den von der Lehrperson bearbeiteten KI-Vorschlag.
 */
export async function updateAiCorrectionSuggestion(
  essayId: string,
  editedSuggestion: string
): Promise<TeacherEssayResult> {
  const authCheck = await requireTeacherAuth()
  if (!authCheck.authenticated) return authCheck.error

  const supabase = createAuthenticatedSupabaseClient(authCheck.supabaseAccessToken)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('essay_ai_corrections')
    .update({ teacher_edited_suggestion: editedSuggestion })
    .eq('essay_id', essayId)
    .eq('status', 'ready')

  if (error) {
    console.error('updateAiCorrectionSuggestion error:', error)
    return { success: false, error: 'Vorschlag konnte nicht gespeichert werden.' }
  }

  revalidatePath('/dashboard/aufsaetze')
  return { success: true, message: 'Vorschlag gespeichert.' }
}

/**
 * Schaltet den KI-Vorschlag für den Schüler frei.
 */
export async function releaseAiCorrection(essayId: string): Promise<TeacherEssayResult> {
  const authCheck = await requireTeacherAuth()
  if (!authCheck.authenticated) return authCheck.error

  const supabase = createAuthenticatedSupabaseClient(authCheck.supabaseAccessToken)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('essay_ai_corrections')
    .update({
      status: 'released',
      released_at: new Date().toISOString(),
      released_by: authCheck.userId,
    })
    .eq('essay_id', essayId)
    .eq('status', 'ready')

  if (error) {
    console.error('releaseAiCorrection error:', error)
    return { success: false, error: 'Freigabe fehlgeschlagen.' }
  }

  revalidatePath('/dashboard/aufsaetze')
  revalidatePath('/aufsaetze')
  return { success: true, message: 'KI-Korrektur an Schüler freigegeben.' }
}

/**
 * Verfeinert einen bestehenden KI-Korrekturvorschlag anhand einer Nachfrage.
 * Sendet den bestehenden Vorschlag + die Nachfrage als Multi-Turn-Konversation an Claude.
 */
export async function refineAiCorrection(
  essayId: string,
  followUpMessage: string
): Promise<TeacherEssayResult> {
  const authCheck = await requireTeacherAuth()
  if (!authCheck.authenticated) return authCheck.error

  if (!followUpMessage.trim()) {
    return { success: false, error: 'Bitte eine Nachfrage eingeben.' }
  }

  const supabase = createAuthenticatedSupabaseClient(authCheck.supabaseAccessToken)
  const adminSupabase = createAdminSupabaseClient()

  // Bestehende Korrektur laden
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing, error: fetchError } = await (supabase as any)
    .from('essay_ai_corrections')
    .select('*, essay:student_essays(title, subject, student:user!student_essays_student_id_fkey(class_level))')
    .eq('essay_id', essayId)
    .eq('status', 'ready')
    .single()

  if (fetchError || !existing) {
    return { success: false, error: 'Keine bearbeitbare Korrektur gefunden.' }
  }

  const currentSuggestion = existing.teacher_edited_suggestion ?? existing.raw_suggestion
  const essayTitle = existing.essay?.title ?? 'Unbekannt'
  const classLevel = existing.essay?.student?.class_level ?? null

  try {
    const systemPrompt = `Du bist ein erfahrener Schweizer Primarschullehrer. Du hast soeben einen Korrekturvorschlag für einen Schüleraufsatz erstellt. Die Lehrperson hat eine Anpassungswünsche. Passe den Korrekturvorschlag entsprechend an und gib die vollständige, aktualisierte Version zurück. Behalte das Markdown-Format bei (# Titel, ## Abschnitte, Leerzeilen zwischen Abschnitten). Verfasse die komplette Korrektur, nicht nur den geänderten Teil.`

    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: AI_MAX_TOKENS,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Hier ist der bisherige Korrekturvorschlag für den Aufsatz «${essayTitle}» (Klassenstufe: ${classLevel ?? 'nicht angegeben'}):\n\n${currentSuggestion}`
        },
        {
          role: 'assistant',
          content: currentSuggestion
        },
        {
          role: 'user',
          content: followUpMessage
        }
      ],
      stream: false,
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const responseAny = response as any
    const refined: string =
      Array.isArray(responseAny.content) && responseAny.content[0]?.type === 'text'
        ? responseAny.content[0].text
        : ''

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminSupabase as any)
      .from('essay_ai_corrections')
      .update({
        teacher_edited_suggestion: refined,
        input_tokens: (existing.input_tokens ?? 0) + (responseAny.usage?.input_tokens ?? 0),
        output_tokens: (existing.output_tokens ?? 0) + (responseAny.usage?.output_tokens ?? 0),
      })
      .eq('essay_id', essayId)

    revalidatePath('/dashboard/aufsaetze')
    return { success: true, message: 'Korrektur angepasst.' }

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
    console.error('refineAiCorrection error:', err)
    return { success: false, error: `Verfeinerung fehlgeschlagen: ${message}` }
  }
}
