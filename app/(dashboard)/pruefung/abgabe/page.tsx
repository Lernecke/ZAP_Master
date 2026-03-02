'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createAuthenticatedBrowserClient } from '@/lib/supabase/client'
import examData from '@/app/data/mathematik_exam.json'
import { OldExamData } from '@/types/old-exam'

interface MergedAnswer {
  question: string
  user_answer: string
  is_correct: boolean
  solution: string
}

export default function ResultsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [correctAnswers, setCorrectAnswers] = useState(0)
  const [grade, setGrade] = useState(0)
  const [showResults, setShowResults] = useState(false)
  const [answers, setAnswers] = useState<MergedAnswer[]>([])
  const [loading, setLoading] = useState(true)

  const userId = session?.user?.id
  
  // Authentifizierter Supabase Client (Best Practice)
  const supabaseAccessToken = session?.supabaseAccessToken
  const supabase = useMemo(
    () => supabaseAccessToken ? createAuthenticatedBrowserClient(supabaseAccessToken) : null,
    [supabaseAccessToken]
  )

  const data = examData as OldExamData
  const totalQuestions = data.exam.tasks.reduce(
    (acc, task) => acc + task.questions.length,
    0
  )

  useEffect(() => {
    const fetchResults = async () => {
      if (!userId || !supabase) {
        setLoading(false)
        return
      }

      const { data: userAnswers, error } = await supabase
        .from('user_exercises')
        .select('question_id, user_answer, is_correct')
        .eq('user_id', userId)
        .eq('exercise_type', 'exam')

      if (error) {
        console.error('Error fetching user results:', error)
        setLoading(false)
        return
      }

      const questions = data.exam.tasks.flatMap((task) => task.questions)

      const mergedAnswers: MergedAnswer[] = questions.map((question) => {
        const userAnswer = userAnswers?.find(
          (ua) => ua.question_id === question.id
        )
        return {
          question: question.question,
          user_answer: userAnswer?.user_answer || 'Keine Antwort',
          is_correct: userAnswer?.is_correct ?? false,
          solution: question.solution,
        }
      })

      const correctCount = mergedAnswers.filter(
        (answer) => answer.is_correct
      ).length
      setCorrectAnswers(correctCount)
      setGrade((correctCount / totalQuestions) * 5 + 1)
      setAnswers(mergedAnswers)
      setLoading(false)
    }

    fetchResults()
  }, [userId, supabase, totalQuestions, data.exam.tasks])

  const toggleShowResults = () => {
    setShowResults((prev) => !prev)
  }

  const handleRestartExam = async () => {
    if (!userId || !supabase) return

    const { error } = await supabase
      .from('user_exercises')
      .delete()
      .eq('user_id', userId)
      .eq('exercise_type', 'exam')

    if (error) {
      console.error('Error deleting exam data:', error)
      return
    }

    router.push('/pruefung/start')
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  const passed = grade >= 4
  const gradeColor = passed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'

  return (
    <div className="space-y-8">
      {/* Result Card */}
      <div
        className={`rounded-2xl p-8 ${
          passed ? 'bg-green-500/10 border-2 border-green-500/30' : 'bg-red-500/10 border-2 border-red-500/30'
        }`}
      >
        <div className="text-center">
          <div className="text-6xl mb-4">{passed ? '🎉' : '📚'}</div>
          <h1 className={`text-4xl font-bold ${gradeColor} mb-2`}>
            Note: {grade.toFixed(1)}
          </h1>
          <p className="text-xl text-muted-foreground">
            {correctAnswers}/{totalQuestions} Fragen richtig beantwortet
          </p>
          <p className={`text-lg mt-4 ${passed ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
            {passed
              ? 'Glückwunsch, du hast die Prüfung bestanden! 🎊'
              : 'Leider nicht bestanden. Übe weiter und versuche es erneut!'}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 justify-center">
        <button
          onClick={toggleShowResults}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
        >
          {showResults ? '📕 Antworten verbergen' : '📖 Meine Antworten anzeigen'}
        </button>
        <button
          onClick={handleRestartExam}
          className="px-6 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors"
        >
          🔄 Prüfung wiederholen
        </button>
        <Link
          href="/pruefung"
          className="px-6 py-3 bg-muted text-foreground rounded-xl hover:bg-muted/80 transition-colors"
        >
          ← Zurück zur Übersicht
        </Link>
      </div>

      {/* Answers Detail */}
      {showResults && (
        <div className="bg-card rounded-2xl shadow-sm border border-border p-6 md:p-8">
          <h2 className="text-2xl font-bold text-foreground mb-6">Deine Antworten</h2>
          <div className="space-y-6">
            {answers.map((answer, index) => (
              <div
                key={index}
                className={`p-4 rounded-xl border-2 ${
                  answer.is_correct
                    ? 'bg-green-500/10 border-green-500/30'
                    : 'bg-red-500/10 border-red-500/30'
                }`}
              >
                <p className="font-semibold text-foreground mb-2">
                  {index + 1}. {answer.question}
                </p>
                <div className="grid gap-2 text-sm">
                  <p>
                    <span className="text-muted-foreground">Deine Antwort:</span>{' '}
                    <span className="font-medium text-foreground">{answer.user_answer}</span>
                  </p>
                  {answer.is_correct ? (
                    <p className="text-green-600 dark:text-green-400 font-semibold flex items-center gap-1">
                      ✓ Richtig
                    </p>
                  ) : (
                    <>
                      <p className="text-red-600 dark:text-red-400 font-semibold flex items-center gap-1">
                        ✗ Falsch
                      </p>
                      <p>
                        <span className="text-muted-foreground">Richtige Antwort:</span>{' '}
                        <span className="font-medium text-green-700 dark:text-green-400">
                          {answer.solution}
                        </span>
                      </p>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Study Tips */}
      {!passed && (
        <div className="bg-primary/10 border border-primary/20 rounded-2xl p-6">
          <h3 className="font-semibold text-foreground mb-3">💡 Lerntipps</h3>
          <ul className="list-disc list-inside text-muted-foreground space-y-2">
            <li>
              Übe regelmässig mit den{' '}
              <Link href="/uebungen/mathematik" className="underline text-primary hover:text-primary/80">
                Mathematik-Übungen
              </Link>
            </li>
            <li>
              Nutze den{' '}
              <Link href="/trainer" className="underline text-primary hover:text-primary/80">
                KI-Trainer
              </Link>{' '}
              für zusätzliche Aufgaben
            </li>
            <li>Schau dir die falschen Antworten genau an und verstehe die Lösungswege</li>
          </ul>
        </div>
      )}
    </div>
  )
}
