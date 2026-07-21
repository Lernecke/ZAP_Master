// Schritt 11a (Abschnitt 2.11 des Architektur-Briefings): Domain-Typen fuer die vier geschuetzten
// Materialbereiche. `MaterialAreaId` kommt bewusst aus types/marketing.ts (Abschnitt 2.11 dort
// bereits definiert) statt hier erneut deklariert zu werden.

import { z } from 'zod'
import type { MaterialAreaId } from './marketing'

export type { MaterialAreaId }

export const MATERIAL_AREA_IDS: MaterialAreaId[] = ['langzeitgymi', 'kurzgymi', 'bms', 'matura']

export function isMaterialAreaId(value: string): value is MaterialAreaId {
  return (MATERIAL_AREA_IDS as string[]).includes(value)
}

export type MaterialAreaDB = {
  id: number
  key: string
  label: string
  created_at: string
}

export type MaterialAccessGrantDB = {
  id: string
  user_id: string
  area_id: number
  status: 'active' | 'revoked' | 'expired'
  valid_from: string
  valid_until: string | null
  source_kind: 'self_study_enrollment' | 'admin_grant'
  source_id: string | null
  created_at: string
  revoked_at: string | null
}

export type MaterialAccessGrantWithUser = MaterialAccessGrantDB & {
  userEmail: string | null
  userName: string | null
}

export type LearningMaterialDB = {
  id: number
  name: string | null
  description: string | null
  type: string | null
  file_url: string | null
  download_path: string | null
  file_size: number | null
  file_type: string | null
  class_levels: string[] | null
  download_count: number | null
  is_link: boolean | null
  is_public: boolean | null
  created_at: string
  subject_id: number | null
  area_id: number | null
  created_by: string | null
}

export const grantAccessFormSchema = z.object({
  email: z.string().trim().email('Bitte eine gültige E-Mail-Adresse angeben.'),
})

export type GrantAccessFormInput = z.infer<typeof grantAccessFormSchema>

export type MaterialienActionResult<T = void> =
  | { success: true; data?: T; message: string }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> }

export type MaterialAreaAccess = {
  allowed: boolean
  isAdmin: boolean
  area: MaterialAreaDB
}
