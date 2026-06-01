import { createAuthenticatedSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { OldExamData } from '@/types/old-exam'
import { ResultsClient } from './results-client'

interface Props {
  userId: string
  token: string
}

export async function ResultsData({ userId, token }: Props) {
  const supabase = createAuthenticatedSupabaseClient(token)
  const publicSupabase = await createServerSupabaseClient()

  const { data: examRow } = await publicSupabase
    .from('trainer_exams')
    .select('data')
    .eq('id', 'zap-math-pruefung')
    .single()

  const data: OldExamData = { exam: examRow?.data as unknown as OldExamData['exam'] }

  const { data: userAnswers, error } = await supabase
    .from('user_exercises')
    .select('question_id, user_answer, is_correct')
    .eq('user_id', userId)
    .eq('exercise_type', 'exam')

  if (error) {
    console.error('Error fetching user results:', error)
  }

  const questions = data.exam.tasks.flatMap((task) => task.questions)
  const totalQuestions = questions.length

  const mergedAnswers = questions.map((question) => {
    const userAnswer = (userAnswers ?? []).find((ua) => ua.question_id === question.id)
    return {
      question: question.question,
      user_answer: userAnswer?.user_answer || 'Keine Antwort',
      is_correct: userAnswer?.is_correct ?? false,
      solution: question.solution,
    }
  })

  const correctAnswers = mergedAnswers.filter((a) => a.is_correct).length
  const grade = (correctAnswers / totalQuestions) * 5 + 1

  return (
    <ResultsClient
      correctAnswers={correctAnswers}
      grade={grade}
      totalQuestions={totalQuestions}
      answers={mergedAnswers}
    />
  )
}
