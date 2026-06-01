'use server'

/* eslint-disable @typescript-eslint/no-explicit-any */
// Note: 'any' is used for Supabase client because the mentorship tables
// don't exist yet in the generated types. After migration is applied,
// regenerate types with `npx supabase gen types typescript` and remove this.

import { createAuthenticatedSupabaseClient } from '@/lib/supabase/server'
import { auth } from '@/lib/auth/config'
import { revalidatePath } from 'next/cache'
import type {
  MentorshipListing,
  MentorshipListingInsert,
  MentorshipListingUpdate,
  MentorshipRequest,
  MentorshipRelation,
  MentorshipMaterial,
  MentorshipMaterialInsert,
  MentorSkill,
  MentorSkillInsert,
  ListingFilters,
} from '@/types/mentorship'

// ============================================
// Result Type
// ============================================

export type ActionResult<T = void> = 
  | { success: true; data?: T; message: string }
  | { success: false; error: string }

// ============================================
// LISTINGS ACTIONS
// ============================================

/**
 * Get all active listings with optional filters
 */
export async function getListings(filters?: ListingFilters): Promise<ActionResult<MentorshipListing[]>> {
  const session = await auth()
  if (!session?.supabaseAccessToken) {
    return { success: false, error: 'Nicht authentifiziert' }
  }

  const supabase = createAuthenticatedSupabaseClient(session.supabaseAccessToken) as any
  
  let query = supabase
    .from('mentorship_listings')
    .select('*')
    .order('created_at', { ascending: false })

  // Apply filters
  if (filters?.type) {
    query = query.eq('type', filters.type)
  }
  if (filters?.status) {
    query = query.eq('status', filters.status)
  } else {
    // Default: nur aktive Listings
    query = query.eq('status', 'ACTIVE')
  }
  if (filters?.class_levels && filters.class_levels.length > 0) {
    query = query.overlaps('class_levels', filters.class_levels)
  }
  if (filters?.subject_ids && filters.subject_ids.length > 0) {
    query = query.overlaps('subject_ids', filters.subject_ids)
  }
  if (filters?.search) {
    query = query.textSearch('title', filters.search)
  }

  const { data, error } = await query

  if (error) {
    console.error('Get listings error:', error)
    return { success: false, error: 'Inserate konnten nicht geladen werden.' }
  }

  return { success: true, data: data as MentorshipListing[], message: 'Inserate geladen' }
}

/**
 * Get my own listings (all statuses)
 */
export async function getMyListings(): Promise<ActionResult<MentorshipListing[]>> {
  const session = await auth()
  if (!session?.user?.id || !session.supabaseAccessToken) {
    return { success: false, error: 'Nicht authentifiziert' }
  }

  const supabase = createAuthenticatedSupabaseClient(session.supabaseAccessToken) as any
  
  const { data, error } = await supabase
    .from('mentorship_listings')
    .select('*')
    .eq('author_id', session.user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Get my listings error:', error)
    return { success: false, error: 'Inserate konnten nicht geladen werden.' }
  }

  return { success: true, data: data as MentorshipListing[], message: 'Eigene Inserate geladen' }
}

/**
 * Get a single listing by ID
 */
export async function getListing(id: string): Promise<ActionResult<MentorshipListing>> {
  const session = await auth()
  if (!session?.supabaseAccessToken) {
    return { success: false, error: 'Nicht authentifiziert' }
  }

  const supabase = createAuthenticatedSupabaseClient(session.supabaseAccessToken) as any
  
  const { data, error } = await supabase
    .from('mentorship_listings')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Get listing error:', error)
    return { success: false, error: 'Inserat nicht gefunden.' }
  }

  return { success: true, data: data as MentorshipListing, message: 'Inserat geladen' }
}

/**
 * Create a new listing
 */
export async function createListing(data: Omit<MentorshipListingInsert, 'author_id'>): Promise<ActionResult<MentorshipListing>> {
  const session = await auth()
  if (!session?.user?.id || !session.supabaseAccessToken) {
    return { success: false, error: 'Nicht authentifiziert' }
  }

  const supabase = createAuthenticatedSupabaseClient(session.supabaseAccessToken) as any
  
  const { data: listing, error } = await supabase
    .from('mentorship_listings')
    .insert({
      ...data,
      author_id: session.user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('Create listing error:', error)
    return { success: false, error: 'Inserat konnte nicht erstellt werden.' }
  }

  revalidatePath('/dashboard/mentorship')
  return { success: true, data: listing as MentorshipListing, message: 'Inserat erstellt!' }
}

/**
 * Update a listing
 */
export async function updateListing(id: string, data: MentorshipListingUpdate): Promise<ActionResult<MentorshipListing>> {
  const session = await auth()
  if (!session?.user?.id || !session.supabaseAccessToken) {
    return { success: false, error: 'Nicht authentifiziert' }
  }

  const supabase = createAuthenticatedSupabaseClient(session.supabaseAccessToken) as any
  
  const { data: listing, error } = await supabase
    .from('mentorship_listings')
    .update(data)
    .eq('id', id)
    .eq('author_id', session.user.id) // Extra Sicherheit
    .select()
    .single()

  if (error) {
    console.error('Update listing error:', error)
    return { success: false, error: 'Inserat konnte nicht aktualisiert werden.' }
  }

  revalidatePath('/dashboard/mentorship')
  return { success: true, data: listing as MentorshipListing, message: 'Inserat aktualisiert!' }
}

/**
 * Delete a listing
 */
export async function deleteListing(id: string): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id || !session.supabaseAccessToken) {
    return { success: false, error: 'Nicht authentifiziert' }
  }

  const supabase = createAuthenticatedSupabaseClient(session.supabaseAccessToken) as any
  
  const { error } = await supabase
    .from('mentorship_listings')
    .delete()
    .eq('id', id)
    .eq('author_id', session.user.id)

  if (error) {
    console.error('Delete listing error:', error)
    return { success: false, error: 'Inserat konnte nicht gelöscht werden.' }
  }

  revalidatePath('/dashboard/mentorship')
  return { success: true, message: 'Inserat gelöscht!' }
}

// ============================================
// REQUESTS ACTIONS
// ============================================

/**
 * Get incoming requests (where I am the target)
 */
export async function getIncomingRequests(): Promise<ActionResult<MentorshipRequest[]>> {
  const session = await auth()
  if (!session?.user?.id || !session.supabaseAccessToken) {
    return { success: false, error: 'Nicht authentifiziert' }
  }

  const supabase = createAuthenticatedSupabaseClient(session.supabaseAccessToken) as any
  
  const { data, error } = await supabase
    .from('mentorship_requests')
    .select(`
      *,
      requester:profiles!mentorship_requests_requester_id_fkey(id, first_name, last_name, avatar_url),
      listing:mentorship_listings!mentorship_requests_listing_id_fkey(id, title, type)
    `)
    .eq('target_id', session.user.id)
    .eq('status', 'PENDING')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Get incoming requests error:', error)
    return { success: false, error: 'Anfragen konnten nicht geladen werden.' }
  }

  return { success: true, data: data as unknown as MentorshipRequest[], message: 'Anfragen geladen' }
}

/**
 * Get outgoing requests (where I am the requester)
 */
export async function getOutgoingRequests(): Promise<ActionResult<MentorshipRequest[]>> {
  const session = await auth()
  if (!session?.user?.id || !session.supabaseAccessToken) {
    return { success: false, error: 'Nicht authentifiziert' }
  }

  const supabase = createAuthenticatedSupabaseClient(session.supabaseAccessToken) as any
  
  const { data, error } = await supabase
    .from('mentorship_requests')
    .select(`
      *,
      target:profiles!mentorship_requests_target_id_fkey(id, first_name, last_name, avatar_url),
      listing:mentorship_listings!mentorship_requests_listing_id_fkey(id, title, type)
    `)
    .eq('requester_id', session.user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Get outgoing requests error:', error)
    return { success: false, error: 'Anfragen konnten nicht geladen werden.' }
  }

  return { success: true, data: data as unknown as MentorshipRequest[], message: 'Anfragen geladen' }
}

/**
 * Create a new request for a listing
 */
export async function createRequest(listingId: string, message?: string): Promise<ActionResult<MentorshipRequest>> {
  const session = await auth()
  if (!session?.user?.id || !session.supabaseAccessToken) {
    return { success: false, error: 'Nicht authentifiziert' }
  }

  const supabase = createAuthenticatedSupabaseClient(session.supabaseAccessToken) as any
  
  // Erst Listing laden um target_id zu bekommen
  const { data: listing, error: listingError } = await supabase
    .from('mentorship_listings')
    .select('author_id')
    .eq('id', listingId)
    .single()

  if (listingError || !listing) {
    return { success: false, error: 'Inserat nicht gefunden.' }
  }

  if (listing.author_id === session.user.id) {
    return { success: false, error: 'Du kannst nicht dein eigenes Inserat anfragen.' }
  }

  const { data: request, error } = await supabase
    .from('mentorship_requests')
    .insert({
      listing_id: listingId,
      requester_id: session.user.id,
      target_id: listing.author_id,
      message,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') { // Unique violation
      return { success: false, error: 'Du hast bereits eine Anfrage für dieses Inserat gestellt.' }
    }
    console.error('Create request error:', error)
    return { success: false, error: 'Anfrage konnte nicht gestellt werden.' }
  }

  revalidatePath('/dashboard/mentorship')
  return { success: true, data: request as MentorshipRequest, message: 'Anfrage gesendet!' }
}

/**
 * Accept a request (creates a relation)
 */
export async function acceptRequest(requestId: string, responseMessage?: string): Promise<ActionResult<MentorshipRelation>> {
  const session = await auth()
  if (!session?.user?.id || !session.supabaseAccessToken) {
    return { success: false, error: 'Nicht authentifiziert' }
  }

  const supabase = createAuthenticatedSupabaseClient(session.supabaseAccessToken) as any
  
  // Request laden und validieren
  const { data: request, error: reqError } = await supabase
    .from('mentorship_requests')
    .select('*, listing:mentorship_listings!mentorship_requests_listing_id_fkey(type)')
    .eq('id', requestId)
    .eq('target_id', session.user.id)
    .eq('status', 'PENDING')
    .single()

  if (reqError || !request) {
    return { success: false, error: 'Anfrage nicht gefunden oder bereits bearbeitet.' }
  }

  // Mentor und Mentee basierend auf Listing-Typ bestimmen
  let mentorId: string
  let menteeId: string
  
  if ((request.listing as { type: string }).type === 'OFFER') {
    // Listing ist ein Angebot → Target (Autor) ist Mentor
    mentorId = request.target_id
    menteeId = request.requester_id
  } else {
    // Listing ist ein Gesuch → Requester (reagiert) ist Mentor
    mentorId = request.requester_id
    menteeId = request.target_id
  }

  // Relation erstellen
  const { data: relation, error: relError } = await supabase
    .from('mentorship_relations')
    .insert({
      mentor_id: mentorId,
      mentee_id: menteeId,
      original_request_id: requestId,
      original_listing_id: request.listing_id,
    })
    .select()
    .single()

  if (relError) {
    console.error('Create relation error:', relError)
    return { success: false, error: 'Beziehung konnte nicht erstellt werden.' }
  }

  // Request updaten
  await supabase
    .from('mentorship_requests')
    .update({
      status: 'ACCEPTED',
      response_message: responseMessage,
      responded_at: new Date().toISOString(),
    })
    .eq('id', requestId)

  revalidatePath('/dashboard/mentorship')
  return { success: true, data: relation as MentorshipRelation, message: 'Anfrage angenommen! Neue Mentoring-Beziehung erstellt.' }
}

/**
 * Reject a request
 */
export async function rejectRequest(requestId: string, responseMessage?: string): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id || !session.supabaseAccessToken) {
    return { success: false, error: 'Nicht authentifiziert' }
  }

  const supabase = createAuthenticatedSupabaseClient(session.supabaseAccessToken) as any
  
  const { error } = await supabase
    .from('mentorship_requests')
    .update({
      status: 'REJECTED',
      response_message: responseMessage,
      responded_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .eq('target_id', session.user.id)
    .eq('status', 'PENDING')

  if (error) {
    console.error('Reject request error:', error)
    return { success: false, error: 'Anfrage konnte nicht abgelehnt werden.' }
  }

  revalidatePath('/dashboard/mentorship')
  return { success: true, message: 'Anfrage abgelehnt.' }
}

/**
 * Cancel own request
 */
export async function cancelRequest(requestId: string): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id || !session.supabaseAccessToken) {
    return { success: false, error: 'Nicht authentifiziert' }
  }

  const supabase = createAuthenticatedSupabaseClient(session.supabaseAccessToken) as any
  
  const { error } = await supabase
    .from('mentorship_requests')
    .update({
      status: 'CANCELLED',
    })
    .eq('id', requestId)
    .eq('requester_id', session.user.id)
    .eq('status', 'PENDING')

  if (error) {
    console.error('Cancel request error:', error)
    return { success: false, error: 'Anfrage konnte nicht zurückgezogen werden.' }
  }

  revalidatePath('/dashboard/mentorship')
  return { success: true, message: 'Anfrage zurückgezogen.' }
}

// ============================================
// RELATIONS ACTIONS
// ============================================

/**
 * Get my active relations (as mentor or mentee)
 */
export async function getMyRelations(): Promise<ActionResult<MentorshipRelation[]>> {
  const session = await auth()
  if (!session?.user?.id || !session.supabaseAccessToken) {
    return { success: false, error: 'Nicht authentifiziert' }
  }

  const supabase = createAuthenticatedSupabaseClient(session.supabaseAccessToken) as any
  
  const { data, error } = await supabase
    .from('mentorship_relations')
    .select(`
      *,
      mentor:profiles!mentorship_relations_mentor_id_fkey(id, first_name, last_name, avatar_url, email),
      mentee:profiles!mentorship_relations_mentee_id_fkey(id, first_name, last_name, avatar_url, email, class_level)
    `)
    .or(`mentor_id.eq.${session.user.id},mentee_id.eq.${session.user.id}`)
    .eq('status', 'ACTIVE')
    .order('started_at', { ascending: false })

  if (error) {
    console.error('Get relations error:', error)
    return { success: false, error: 'Beziehungen konnten nicht geladen werden.' }
  }

  return { success: true, data: data as unknown as MentorshipRelation[], message: 'Beziehungen geladen' }
}

/**
 * End a relation
 */
export async function endRelation(relationId: string, reason: string): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id || !session.supabaseAccessToken) {
    return { success: false, error: 'Nicht authentifiziert' }
  }

  const supabase = createAuthenticatedSupabaseClient(session.supabaseAccessToken) as any
  
  const { error } = await supabase
    .from('mentorship_relations')
    .update({
      status: 'ENDED',
      ended_reason: reason,
      ended_at: new Date().toISOString(),
    })
    .eq('id', relationId)
    .or(`mentor_id.eq.${session.user.id},mentee_id.eq.${session.user.id}`)

  if (error) {
    console.error('End relation error:', error)
    return { success: false, error: 'Beziehung konnte nicht beendet werden.' }
  }

  revalidatePath('/dashboard/mentorship')
  return { success: true, message: 'Mentoring-Beziehung beendet.' }
}

// ============================================
// MATERIALS ACTIONS
// ============================================

/**
 * Get materials for a relation
 */
export async function getMaterials(relationId: string): Promise<ActionResult<MentorshipMaterial[]>> {
  const session = await auth()
  if (!session?.user?.id || !session.supabaseAccessToken) {
    return { success: false, error: 'Nicht authentifiziert' }
  }

  const supabase = createAuthenticatedSupabaseClient(session.supabaseAccessToken) as any
  
  const { data, error } = await supabase
    .from('mentorship_materials')
    .select(`
      *,
      uploader:profiles!mentorship_materials_uploader_id_fkey(id, first_name, last_name, avatar_url),
      assigned_mentor:profiles!mentorship_materials_assigned_to_fkey(id, first_name, last_name, avatar_url)
    `)
    .eq('relation_id', relationId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Get materials error:', error)
    return { success: false, error: 'Materialien konnten nicht geladen werden.' }
  }

  return { success: true, data: data as unknown as MentorshipMaterial[], message: 'Materialien geladen' }
}

/**
 * Submit new material (Student)
 */
export async function submitMaterial(data: Omit<MentorshipMaterialInsert, 'uploader_id'>): Promise<ActionResult<MentorshipMaterial>> {
  const session = await auth()
  if (!session?.user?.id || !session.supabaseAccessToken) {
    return { success: false, error: 'Nicht authentifiziert' }
  }

  const supabase = createAuthenticatedSupabaseClient(session.supabaseAccessToken) as any
  
  const { data: material, error } = await supabase
    .from('mentorship_materials')
    .insert({
      ...data,
      uploader_id: session.user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('Submit material error:', error)
    return { success: false, error: 'Material konnte nicht hochgeladen werden.' }
  }

  revalidatePath('/dashboard/mentorship')
  return { success: true, data: material as MentorshipMaterial, message: 'Material eingereicht!' }
}

/**
 * Provide feedback on material (Mentor)
 */
export async function provideFeedback(
  materialId: string,
  feedback: string,
  grade?: string,
  feedbackFileUrls?: string[]
): Promise<ActionResult<MentorshipMaterial>> {
  const session = await auth()
  if (!session?.user?.id || !session.supabaseAccessToken) {
    return { success: false, error: 'Nicht authentifiziert' }
  }

  const supabase = createAuthenticatedSupabaseClient(session.supabaseAccessToken) as any
  
  const { data: material, error } = await supabase
    .from('mentorship_materials')
    .update({
      feedback,
      grade,
      feedback_file_urls: feedbackFileUrls,
      status: 'CORRECTED',
      corrected_at: new Date().toISOString(),
    })
    .eq('id', materialId)
    .eq('assigned_to', session.user.id) // Nur der zugewiesene Mentor
    .select()
    .single()

  if (error) {
    console.error('Provide feedback error:', error)
    return { success: false, error: 'Feedback konnte nicht gespeichert werden.' }
  }

  revalidatePath('/dashboard/mentorship')
  return { success: true, data: material as MentorshipMaterial, message: 'Feedback gespeichert!' }
}

// ============================================
// SKILLS ACTIONS
// ============================================

/**
 * Get my skills (for teachers)
 */
export async function getMySkills(): Promise<ActionResult<MentorSkill[]>> {
  const session = await auth()
  if (!session?.user?.id || !session.supabaseAccessToken) {
    return { success: false, error: 'Nicht authentifiziert' }
  }

  const supabase = createAuthenticatedSupabaseClient(session.supabaseAccessToken) as any
  
  const { data, error } = await supabase
    .from('mentor_skills')
    .select(`
      *,
      subject:subjects(id, name, slug)
    `)
    .eq('mentor_id', session.user.id)

  if (error) {
    console.error('Get skills error:', error)
    return { success: false, error: 'Skills konnten nicht geladen werden.' }
  }

  return { success: true, data: data as unknown as MentorSkill[], message: 'Skills geladen' }
}

/**
 * Add a skill
 */
export async function addSkill(data: MentorSkillInsert): Promise<ActionResult<MentorSkill>> {
  const session = await auth()
  if (!session?.user?.id || !session.supabaseAccessToken) {
    return { success: false, error: 'Nicht authentifiziert' }
  }

  const supabase = createAuthenticatedSupabaseClient(session.supabaseAccessToken) as any
  
  const { data: skill, error } = await supabase
    .from('mentor_skills')
    .insert({
      ...data,
      mentor_id: session.user.id,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Diesen Skill hast du bereits hinzugefügt.' }
    }
    console.error('Add skill error:', error)
    return { success: false, error: 'Skill konnte nicht hinzugefügt werden.' }
  }

  revalidatePath('/dashboard/mentorship')
  return { success: true, data: skill as MentorSkill, message: 'Skill hinzugefügt!' }
}

/**
 * Remove a skill
 */
export async function removeSkill(skillId: string): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id || !session.supabaseAccessToken) {
    return { success: false, error: 'Nicht authentifiziert' }
  }

  const supabase = createAuthenticatedSupabaseClient(session.supabaseAccessToken) as any
  
  const { error } = await supabase
    .from('mentor_skills')
    .delete()
    .eq('id', skillId)
    .eq('mentor_id', session.user.id)

  if (error) {
    console.error('Remove skill error:', error)
    return { success: false, error: 'Skill konnte nicht entfernt werden.' }
  }

  revalidatePath('/dashboard/mentorship')
  return { success: true, message: 'Skill entfernt!' }
}
