'use server'

import { createAuthenticatedSupabaseClient, createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { auth } from '@/lib/auth/config'
import { revalidatePath } from 'next/cache'

// Öffentliche Funktion - braucht kein Auth
export async function getSubjects() {
  const supabase = await createServerSupabaseClient()
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('subjects')
    .select('*')
    .order('name')
  
  if (error) {
    return { success: false, error: error.message }
  }
  
  return { success: true, data }
}

export async function getMaterialien() {
  const session = await auth()
  
  if (!session?.user?.id || !session.supabaseAccessToken) {
    return { success: false, error: 'Nicht authentifiziert' }
  }

  const supabase = createAuthenticatedSupabaseClient(session.supabaseAccessToken)
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('learning_materials')
    .select(`
      *,
      subjects (id, name, thumbnail_url)
    `)
    .order('created_at', { ascending: false })
  
  // Lehrpersonen sehen nur ihre eigenen Materialien, Admins sehen alle
  if (session.user.role === 'lehrperson') {
    query = query.eq('created_by', session.user.id)
  }
  
  const { data, error } = await query
  
  if (error) {
    return { success: false, error: error.message }
  }
  
  return { success: true, data }
}

export async function createMaterial(formData: FormData) {
  const session = await auth()
  
  if (!session?.user || !session.supabaseAccessToken || !['lehrperson', 'admin'].includes(session.user.role || '')) {
    return { success: false, error: 'Nicht autorisiert' }
  }
  
  const supabase = createAuthenticatedSupabaseClient(session.supabaseAccessToken)
  
  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const subjectId = formData.get('subject_id') as string
  const type = formData.get('type') as string
  const classLevels = formData.getAll('class_levels') as string[]
  const fileUrl = formData.get('file_url') as string
  const fileSize = formData.get('file_size') as string
  const fileType = formData.get('file_type') as string
  const isLink = formData.get('is_link') === 'true'
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('learning_materials')
    .insert({
      name,
      description: description || null,
      subject_id: subjectId ? parseInt(subjectId) : null,
      type: type || 'document',
      class_levels: classLevels.length > 0 ? classLevels : ['5. Klasse', '6. Klasse'],
      file_url: fileUrl || null,
      file_size: fileSize ? parseInt(fileSize) : null,
      file_type: fileType || null,
      is_link: isLink,
      created_by: session.user.id,
      is_public: true,
    })
    .select()
    .single()
  
  if (error) {
    console.error('Create material error:', error)
    return { success: false, error: error.message }
  }
  
  revalidatePath('/dashboard/materialien')
  revalidatePath('/materialien')
  
  return { success: true, data }
}

export async function updateMaterial(id: number, formData: FormData) {
  const session = await auth()
  
  if (!session?.user || !session.supabaseAccessToken || !['lehrperson', 'admin'].includes(session.user.role || '')) {
    return { success: false, error: 'Nicht autorisiert' }
  }
  
  const supabase = createAuthenticatedSupabaseClient(session.supabaseAccessToken)
  
  // Prüfe ob der User der Ersteller ist (außer Admin)
  if (session.user.role !== 'admin') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase as any)
      .from('learning_materials')
      .select('created_by')
      .eq('id', id)
      .single()
    
    if (existing?.created_by !== session.user.id) {
      return { success: false, error: 'Nicht autorisiert - nur eigene Materialien bearbeiten' }
    }
  }
  
  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const subjectId = formData.get('subject_id') as string
  const type = formData.get('type') as string
  const classLevels = formData.getAll('class_levels') as string[]
  const isPublic = formData.get('is_public') === 'true'
  
  const updateData: Record<string, unknown> = {
    name,
    description: description || null,
    subject_id: subjectId ? parseInt(subjectId) : null,
    type: type || 'document',
    class_levels: classLevels.length > 0 ? classLevels : ['5. Klasse', '6. Klasse'],
    is_public: isPublic,
  }
  
  // Neue Datei falls hochgeladen
  const fileUrl = formData.get('file_url') as string
  const fileSize = formData.get('file_size') as string
  const fileType = formData.get('file_type') as string
  
  if (fileUrl) {
    updateData.file_url = fileUrl
    updateData.file_size = fileSize ? parseInt(fileSize) : null
    updateData.file_type = fileType || null
  }
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('learning_materials')
    .update(updateData)
    .eq('id', id)
  
  if (error) {
    console.error('Update material error:', error)
    return { success: false, error: error.message }
  }
  
  revalidatePath('/dashboard/materialien')
  revalidatePath('/materialien')
  
  return { success: true }
}

export async function deleteMaterial(id: number) {
  const session = await auth()
  
  if (!session?.user || !session.supabaseAccessToken || !['lehrperson', 'admin'].includes(session.user.role || '')) {
    return { success: false, error: 'Nicht autorisiert' }
  }
  
  const supabase = createAuthenticatedSupabaseClient(session.supabaseAccessToken)
  // Admin-Client für Storage-Operationen
  const adminSupabase = createAdminSupabaseClient()
  
  // Hole Datei-URL zum Löschen aus Storage
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: material } = await (supabase as any)
    .from('learning_materials')
    .select('file_url, created_by')
    .eq('id', id)
    .single()
  
  // Prüfe Berechtigung
  if (session.user.role !== 'admin' && material?.created_by !== session.user.id) {
    return { success: false, error: 'Nicht autorisiert - nur eigene Materialien löschen' }
  }
  
  // Lösche aus DB (mit auth client)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('learning_materials')
    .delete()
    .eq('id', id)
  
  if (error) {
    console.error('Delete material error:', error)
    return { success: false, error: error.message }
  }
  
  // Lösche Datei aus Storage falls vorhanden (mit admin client)
  if (material?.file_url) {
    try {
      const urlParts = material.file_url.split('/lernmaterialien/')
      if (urlParts[1]) {
        await adminSupabase.storage
          .from('lernmaterialien')
          .remove([urlParts[1]])
      }
    } catch (e) {
      console.error('Error deleting file from storage:', e)
    }
  }
  
  revalidatePath('/dashboard/materialien')
  revalidatePath('/materialien')
  
  return { success: true }
}
