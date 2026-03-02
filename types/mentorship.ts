// ============================================
// Mentorship System Types
// Created: 2. März 2026
// ============================================

// ============================================
// Enums / Literal Types
// ============================================

export type ListingType = 'OFFER' | 'REQUEST'
export type ListingStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CLOSED'
export type RequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED'
export type RelationStatus = 'ACTIVE' | 'PAUSED' | 'ENDED'
export type MaterialType = 'ESSAY' | 'WORKSHEET' | 'HOMEWORK' | 'OTHER'
export type MaterialStatus = 'PENDING' | 'IN_PROGRESS' | 'CORRECTED' | 'RETURNED'

// ============================================
// Database Row Types
// ============================================

export interface MentorSkill {
  id: string
  mentor_id: string
  subject_id: number
  class_levels: number[]
  years_experience: number | null
  description: string | null
  created_at: string
  updated_at: string
}

export interface MentorSkillInsert {
  id?: string
  mentor_id: string
  subject_id: number
  class_levels?: number[]
  years_experience?: number | null
  description?: string | null
  created_at?: string
  updated_at?: string
}

export interface MentorSkillUpdate {
  id?: string
  mentor_id?: string
  subject_id?: number
  class_levels?: number[]
  years_experience?: number | null
  description?: string | null
  updated_at?: string
}

export interface MentorshipListing {
  id: string
  author_id: string
  type: ListingType
  title: string
  description: string | null
  subject_ids: number[]
  class_levels: number[]
  max_mentees: number | null
  current_mentees: number
  availability: string | null
  status: ListingStatus
  is_featured: boolean
  created_at: string
  updated_at: string
  expires_at: string | null
}

export interface MentorshipListingInsert {
  id?: string
  author_id: string
  type: ListingType
  title: string
  description?: string | null
  subject_ids?: number[]
  class_levels?: number[]
  max_mentees?: number | null
  current_mentees?: number
  availability?: string | null
  status?: ListingStatus
  is_featured?: boolean
  created_at?: string
  updated_at?: string
  expires_at?: string | null
}

export interface MentorshipListingUpdate {
  id?: string
  author_id?: string
  type?: ListingType
  title?: string
  description?: string | null
  subject_ids?: number[]
  class_levels?: number[]
  max_mentees?: number | null
  current_mentees?: number
  availability?: string | null
  status?: ListingStatus
  is_featured?: boolean
  updated_at?: string
  expires_at?: string | null
}

export interface MentorshipRequest {
  id: string
  listing_id: string
  requester_id: string
  target_id: string
  message: string | null
  response_message: string | null
  status: RequestStatus
  responded_at: string | null
  created_at: string
  expires_at: string
}

export interface MentorshipRequestInsert {
  id?: string
  listing_id: string
  requester_id: string
  target_id: string
  message?: string | null
  response_message?: string | null
  status?: RequestStatus
  responded_at?: string | null
  created_at?: string
  expires_at?: string
}

export interface MentorshipRequestUpdate {
  id?: string
  listing_id?: string
  requester_id?: string
  target_id?: string
  message?: string | null
  response_message?: string | null
  status?: RequestStatus
  responded_at?: string | null
  expires_at?: string
}

export interface MentorshipRelation {
  id: string
  mentor_id: string
  mentee_id: string
  original_request_id: string | null
  original_listing_id: string | null
  status: RelationStatus
  ended_reason: string | null
  materials_submitted: number
  materials_corrected: number
  started_at: string
  ended_at: string | null
  created_at: string
}

export interface MentorshipRelationInsert {
  id?: string
  mentor_id: string
  mentee_id: string
  original_request_id?: string | null
  original_listing_id?: string | null
  status?: RelationStatus
  ended_reason?: string | null
  materials_submitted?: number
  materials_corrected?: number
  started_at?: string
  ended_at?: string | null
}

export interface MentorshipRelationUpdate {
  id?: string
  mentor_id?: string
  mentee_id?: string
  status?: RelationStatus
  ended_reason?: string | null
  materials_submitted?: number
  materials_corrected?: number
  ended_at?: string | null
}

export interface MentorshipMaterial {
  id: string
  relation_id: string
  uploader_id: string
  assigned_to: string
  type: MaterialType
  title: string
  description: string | null
  file_urls: string[]
  file_types: string[]
  status: MaterialStatus
  submitted_at: string
  corrected_at: string | null
  feedback: string | null
  feedback_file_urls: string[] | null
  grade: string | null
  created_at: string
  updated_at: string
}

export interface MentorshipMaterialInsert {
  id?: string
  relation_id: string
  uploader_id: string
  assigned_to: string
  type?: MaterialType
  title: string
  description?: string | null
  file_urls?: string[]
  file_types?: string[]
  status?: MaterialStatus
  submitted_at?: string
  corrected_at?: string | null
  feedback?: string | null
  feedback_file_urls?: string[] | null
  grade?: string | null
  created_at?: string
  updated_at?: string
}

export interface MentorshipMaterialUpdate {
  id?: string
  relation_id?: string
  uploader_id?: string
  assigned_to?: string
  type?: MaterialType
  title?: string
  description?: string | null
  file_urls?: string[]
  file_types?: string[]
  status?: MaterialStatus
  corrected_at?: string | null
  feedback?: string | null
  feedback_file_urls?: string[] | null
  grade?: string | null
  updated_at?: string
}

export interface ChatMessage {
  id: string
  relation_id: string
  sender_id: string
  content: string
  attachment_urls: string[] | null
  is_read: boolean
  read_at: string | null
  created_at: string
  edited_at: string | null
}

export interface ChatMessageInsert {
  id?: string
  relation_id: string
  sender_id: string
  content: string
  attachment_urls?: string[] | null
  is_read?: boolean
  read_at?: string | null
  created_at?: string
  edited_at?: string | null
}

export interface ChatMessageUpdate {
  id?: string
  is_read?: boolean
  read_at?: string | null
  edited_at?: string | null
}

// ============================================
// Extended Types with Relations
// ============================================

import { Profile } from './database'

export interface MentorSkillWithSubject extends MentorSkill {
  subject: {
    id: string
    name: string
    slug: string
  }
}

export interface MentorSkillWithMentor extends MentorSkill {
  mentor: Pick<Profile, 'id' | 'first_name' | 'last_name' | 'avatar_url'>
  subject: {
    id: string
    name: string
    slug: string
  }
}

export interface MentorshipListingWithAuthor extends MentorshipListing {
  author: Pick<Profile, 'id' | 'first_name' | 'last_name' | 'avatar_url' | 'role'>
}

export interface MentorshipRequestWithProfiles extends MentorshipRequest {
  requester: Pick<Profile, 'id' | 'first_name' | 'last_name' | 'avatar_url'>
  target: Pick<Profile, 'id' | 'first_name' | 'last_name' | 'avatar_url'>
  listing: Pick<MentorshipListing, 'id' | 'title' | 'type'>
}

export interface MentorshipRelationWithProfiles extends MentorshipRelation {
  mentor: Pick<Profile, 'id' | 'first_name' | 'last_name' | 'avatar_url' | 'email'>
  mentee: Pick<Profile, 'id' | 'first_name' | 'last_name' | 'avatar_url' | 'email' | 'class_level'>
}

export interface MentorshipMaterialWithProfiles extends MentorshipMaterial {
  uploader: Pick<Profile, 'id' | 'first_name' | 'last_name' | 'avatar_url'>
  assigned_mentor: Pick<Profile, 'id' | 'first_name' | 'last_name' | 'avatar_url'>
}

export interface ChatMessageWithSender extends ChatMessage {
  sender: Pick<Profile, 'id' | 'first_name' | 'last_name' | 'avatar_url'>
}

// ============================================
// Form Types
// ============================================

export interface CreateListingForm {
  type: ListingType
  title: string
  description?: string
  subject_ids: string[]
  class_levels: string[]
  max_mentees?: number
  availability?: string
}

export interface CreateRequestForm {
  listing_id: string
  message?: string
}

export interface SubmitMaterialForm {
  relation_id: string
  type: MaterialType
  title: string
  description?: string
  files: File[]
}

export interface ProvideFeedbackForm {
  material_id: string
  feedback: string
  grade?: string
  feedback_files?: File[]
}

// ============================================
// Filter Types
// ============================================

export interface ListingFilters {
  type?: ListingType
  subject_ids?: string[]
  class_levels?: string[]
  status?: ListingStatus
  search?: string
}

export interface MaterialFilters {
  type?: MaterialType
  status?: MaterialStatus
  relation_id?: string
}
