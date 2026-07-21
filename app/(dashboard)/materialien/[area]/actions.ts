'use server'

// Schritt 11a (Abschnitt 2.11 des Architektur-Briefings): Server Actions fuer die vier
// geschuetzten Materialbereiche. Zugriff wird serverseitig UND per RLS geprueft (Migration
// 20260720140000_material_access_schema.sql, 20260721125216_material_access_grant_admin_and_storage.sql)
// -- diese Actions sind Komfort/UX, keine zusaetzliche Sicherheitsgrenze; ein Clientfilter allein
// waere keine Autorisierung.

import { createAuthenticatedSupabaseClient } from '@/lib/supabase/server'
import { auth } from '@/lib/auth/config'
import { revalidatePath } from 'next/cache'
import {
  isMaterialAreaId,
  grantAccessFormSchema,
  type MaterialAreaId,
  type MaterialAreaDB,
  type MaterialAreaAccess,
  type MaterialAccessGrantWithUser,
  type LearningMaterialDB,
  type MaterialienActionResult,
} from '@/types/kurs-materialien'

async function requireSession(): Promise<
  | { authorized: true; userId: string; role: string; supabaseAccessToken: string }
  | { authorized: false; error: MaterialienActionResult<never> }
> {
  const session = await auth()
  if (!session?.user || !session.supabaseAccessToken) {
    return { authorized: false, error: { success: false, error: 'Du musst angemeldet sein, um diese Aktion auszuführen.' } }
  }
  return {
    authorized: true,
    userId: session.user.id,
    role: session.user.role,
    supabaseAccessToken: session.supabaseAccessToken,
  }
}

async function requireAdminSession(): Promise<
  | { authorized: true; userId: string; supabaseAccessToken: string }
  | { authorized: false; error: MaterialienActionResult<never> }
> {
  const check = await requireSession()
  if (!check.authorized) return check
  if (check.role !== 'admin') {
    return { authorized: false, error: { success: false, error: 'Nur Administratorinnen und Administratoren verwalten Materialfreigaben.' } }
  }
  return check
}

async function loadArea(supabase: ReturnType<typeof createAuthenticatedSupabaseClient>, areaId: MaterialAreaId): Promise<MaterialAreaDB | null> {
  const { data, error } = await supabase.from('material_areas').select('*').eq('key', areaId).maybeSingle()
  if (error || !data) return null
  return data as MaterialAreaDB
}

/**
 * Prueft den aktuellen Materialzugriff fuer einen Bereich. `allowed` ist true bei aktivem,
 * nicht abgelaufenem Grant ODER Admin-/Content-Manager-Rolle (getrennte Rollenpruefung, siehe
 * Abschnitt 2.11 -- kein simulierter Grant fuer Admins).
 */
export async function checkMaterialAreaAccess(areaId: string): Promise<MaterialienActionResult<MaterialAreaAccess>> {
  if (!isMaterialAreaId(areaId)) {
    return { success: false, error: 'Unbekannter Materialbereich.' }
  }
  const authCheck = await requireSession()
  if (!authCheck.authorized) return authCheck.error

  const supabase = createAuthenticatedSupabaseClient(authCheck.supabaseAccessToken)
  const area = await loadArea(supabase, areaId)
  if (!area) {
    return { success: false, error: 'Unbekannter Materialbereich.' }
  }

  if (authCheck.role === 'admin' || authCheck.role === 'lehrperson') {
    return { success: true, data: { allowed: true, isAdmin: authCheck.role === 'admin', area }, message: 'Zugriff geprüft' }
  }

  const { data: grant, error } = await supabase
    .from('material_access_grants')
    .select('id')
    .eq('area_id', area.id)
    .eq('status', 'active')
    .or(`valid_until.is.null,valid_until.gt.${new Date().toISOString()}`)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Supabase Error:', error)
    return { success: false, error: 'Zugriff konnte nicht geprüft werden.' }
  }

  return { success: true, data: { allowed: !!grant, isAdmin: false, area }, message: 'Zugriff geprüft' }
}

/**
 * Lädt die Materialien eines Bereichs. Verlässt sich zusätzlich auf RLS
 * (learning_materials_read_public_own_or_granted) -- ohne Zugriff liefert Supabase hier ohnehin
 * nichts zurück, unabhängig vom obigen Access-Check.
 */
export async function getAreaMaterials(areaId: string): Promise<MaterialienActionResult<LearningMaterialDB[]>> {
  if (!isMaterialAreaId(areaId)) {
    return { success: false, error: 'Unbekannter Materialbereich.' }
  }
  const authCheck = await requireSession()
  if (!authCheck.authorized) return authCheck.error

  const supabase = createAuthenticatedSupabaseClient(authCheck.supabaseAccessToken)
  const area = await loadArea(supabase, areaId)
  if (!area) {
    return { success: false, error: 'Unbekannter Materialbereich.' }
  }

  const { data, error } = await supabase
    .from('learning_materials')
    .select('*')
    .eq('area_id', area.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Supabase Error:', error)
    return { success: false, error: 'Materialien konnten nicht geladen werden.' }
  }
  return { success: true, data: (data ?? []) as LearningMaterialDB[], message: 'Materialien geladen' }
}

/**
 * Liefert ein Downloadziel für ein einzelnes Material: bei Link-Materialien die externe URL,
 * sonst eine kurzlebige Signed URL aus dem privaten `lernmaterialien`-Bucket. Das RLS-SELECT auf
 * `learning_materials` (Materialzeile) UND die Storage-Policy `lernmaterialien_read_access`
 * (Objektdatei) müssen beide erfolgreich sein -- ohne aktiven Grant liefert bereits der erste
 * Schritt keine Zeile.
 */
export async function getMaterialDownloadUrl(materialId: number): Promise<MaterialienActionResult<{ url: string }>> {
  const authCheck = await requireSession()
  if (!authCheck.authorized) return authCheck.error

  const supabase = createAuthenticatedSupabaseClient(authCheck.supabaseAccessToken)
  const { data: material, error } = await supabase
    .from('learning_materials')
    .select('id, is_link, file_url, download_path')
    .eq('id', materialId)
    .maybeSingle()

  if (error || !material) {
    return { success: false, error: 'Kein Zugang zu diesem Material.' }
  }

  if (material.is_link) {
    if (!material.file_url) {
      return { success: false, error: 'Für dieses Material ist kein Ziel hinterlegt.' }
    }
    return { success: true, data: { url: material.file_url }, message: 'Link geladen' }
  }

  if (!material.download_path) {
    return { success: false, error: 'Für dieses Material ist keine Datei hinterlegt.' }
  }

  const { data: signed, error: signError } = await supabase.storage
    .from('lernmaterialien')
    .createSignedUrl(material.download_path, 120)

  if (signError || !signed?.signedUrl) {
    console.error('Supabase Storage Error:', signError)
    return { success: false, error: 'Download-Link konnte nicht erstellt werden.' }
  }

  return { success: true, data: { url: signed.signedUrl }, message: 'Download-Link erstellt (2 Minuten gültig)' }
}

/**
 * Listet aktive/historische Grants eines Bereichs für die Admin-Ansicht, angereichert um
 * E-Mail/Name aus profiles (kein zweiter Join in der DB nötig -- zwei kleine Abfragen genügen bei
 * den zu erwartenden geringen Fallzahlen pro Bereich).
 */
export async function listAreaGrants(areaId: string): Promise<MaterialienActionResult<MaterialAccessGrantWithUser[]>> {
  if (!isMaterialAreaId(areaId)) {
    return { success: false, error: 'Unbekannter Materialbereich.' }
  }
  const authCheck = await requireAdminSession()
  if (!authCheck.authorized) return authCheck.error

  const supabase = createAuthenticatedSupabaseClient(authCheck.supabaseAccessToken)
  const area = await loadArea(supabase, areaId)
  if (!area) {
    return { success: false, error: 'Unbekannter Materialbereich.' }
  }

  const { data: grants, error } = await supabase
    .from('material_access_grants')
    .select('*')
    .eq('area_id', area.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Supabase Error:', error)
    return { success: false, error: 'Freigaben konnten nicht geladen werden.' }
  }

  const userIds = Array.from(new Set((grants ?? []).map((g) => g.user_id)))
  const { data: profiles } = userIds.length
    ? await supabase.from('profiles').select('id, email, first_name, last_name').in('id', userIds)
    : { data: [] }

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]))

  const enriched: MaterialAccessGrantWithUser[] = (grants ?? []).map((g) => {
    const profile = profileById.get(g.user_id)
    return {
      ...(g as MaterialAccessGrantWithUser),
      userEmail: profile?.email ?? null,
      userName: profile ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || null : null,
    }
  })

  return { success: true, data: enriched, message: 'Freigaben geladen' }
}

/**
 * Erteilt einen admin_grant-Zugriff für ein bestehendes Konto (per E-Mail). Ein Elternkauf ohne
 * vorhandenes Schülerkonto (Einladungs-/Claim-Flow) ist bewusst nicht Teil dieser Runde (Abschnitt
 * 2.11 -- separate, spätere Erweiterung).
 */
export async function adminGrantAccessAction(areaId: string, input: { email: string }): Promise<MaterialienActionResult<string>> {
  if (!isMaterialAreaId(areaId)) {
    return { success: false, error: 'Unbekannter Materialbereich.' }
  }
  const authCheck = await requireAdminSession()
  if (!authCheck.authorized) return authCheck.error

  const parsed = grantAccessFormSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Bitte eine gültige E-Mail-Adresse angeben.', fieldErrors: { email: [parsed.error.issues[0]?.message ?? 'Ungültig'] } }
  }

  const supabase = createAuthenticatedSupabaseClient(authCheck.supabaseAccessToken)
  const area = await loadArea(supabase, areaId)
  if (!area) {
    return { success: false, error: 'Unbekannter Materialbereich.' }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', parsed.data.email.toLowerCase())
    .maybeSingle()

  if (profileError || !profile) {
    return { success: false, error: 'Kein Konto mit dieser E-Mail-Adresse gefunden.', fieldErrors: { email: ['Kein Konto gefunden.'] } }
  }

  const { data: inserted, error } = await supabase
    .from('material_access_grants')
    .insert({ user_id: profile.id, area_id: area.id, source_kind: 'admin_grant', status: 'active' })
    .select('id')
    .single()

  if (error) {
    console.error('Supabase Error:', error)
    return { success: false, error: 'Freigabe konnte nicht erteilt werden.' }
  }

  revalidatePath(`/materialien/${areaId}`)
  return { success: true, data: inserted.id as string, message: 'Zugriff erteilt.' }
}

/** Entzieht einen Grant per Statuswechsel (niemals Hard-Delete, Abschnitt 2.11). */
export async function adminRevokeAccessAction(areaId: string, grantId: string): Promise<MaterialienActionResult> {
  if (!isMaterialAreaId(areaId)) {
    return { success: false, error: 'Unbekannter Materialbereich.' }
  }
  const authCheck = await requireAdminSession()
  if (!authCheck.authorized) return authCheck.error

  const supabase = createAuthenticatedSupabaseClient(authCheck.supabaseAccessToken)
  const { error } = await supabase
    .from('material_access_grants')
    .update({ status: 'revoked', revoked_at: new Date().toISOString() })
    .eq('id', grantId)

  if (error) {
    console.error('Supabase Error:', error)
    return { success: false, error: 'Zugriff konnte nicht entzogen werden.' }
  }

  revalidatePath(`/materialien/${areaId}`)
  return { success: true, message: 'Zugriff entzogen.' }
}
