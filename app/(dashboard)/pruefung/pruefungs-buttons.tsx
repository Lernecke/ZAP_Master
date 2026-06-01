import { createAuthenticatedSupabaseClient } from '@/lib/supabase/server'
import { PruefungsButtonsClient } from './pruefungs-buttons-client'

interface Props {
  userId: string
  token: string
}

export async function PruefungsButtons({ userId, token }: Props) {
  const supabase = createAuthenticatedSupabaseClient(token)

  const { data } = await supabase
    .from('user_exercises')
    .select('id')
    .eq('user_id', userId)
    .eq('exercise_type', 'exam')

  const hasExamAnswers = (data?.length ?? 0) > 0

  return <PruefungsButtonsClient hasExamAnswers={hasExamAnswers} />
}
