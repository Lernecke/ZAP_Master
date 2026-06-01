import { createAuthenticatedSupabaseClient } from '@/lib/supabase/server'
import { MaterialienClient } from './materialien-client'

interface Subject {
  id: number
  name: string
  thumbnail_url: string | null
}

export interface Material {
  id: number
  name: string
  description: string | null
  type: string
  file_url: string | null
  file_size: number | null
  file_type: string | null
  class_levels: string[]
  download_count: number
  is_link?: boolean
  created_at: string
  subject_id: number
  subjects: Subject
  created_by: string | null
}

interface Props {
  token: string
}

export async function MaterialienListe({ token }: Props) {
  const supabase = createAuthenticatedSupabaseClient(token)

  const [{ data: subjectsData }, { data: materialsData }] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('subjects').select('*').order('name'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('learning_materials')
      .select('*, subjects (id, name, thumbnail_url)')
      .eq('is_public', true)
      .order('created_at', { ascending: false }),
  ])

  return (
    <MaterialienClient
      initialMaterials={materialsData ?? []}
      subjects={subjectsData ?? []}
    />
  )
}
