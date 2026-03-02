import { auth } from '@/lib/auth/config'
import { createAuthenticatedSupabaseClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { Exam } from '@/types/exam'
import ExamClient from '@/app/components/exam/ExamClient'

interface Props {
  params: Promise<{
    id: string
  }>
}

export default async function ExamPage({ params }: Props) {
  const session = await auth()
  
  if (!session?.user?.id || !session.supabaseAccessToken) {
    redirect('/login')
  }

  const { id } = await params
  const supabase = createAuthenticatedSupabaseClient(session.supabaseAccessToken)

  const { data: examData, error } = await supabase
    .from('trainer_exams')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !examData) {
    console.error('Error fetching exam:', error)
    notFound()
  }

  // Reconstruct the full Exam object
  const examContent = examData.data as unknown as Exam
  const exam: Exam = {
    id: examData.id,
    title: examData.title,
    subject: examData.subject as 'Math' | 'German',
    year: examData.year,
    generatedBy: examData.generated_by || undefined,
    textLines: examData.text_lines || undefined,
    meta: examContent.meta,
    questions: examContent.questions || [],
  }

  return <ExamClient exam={exam} />
}
