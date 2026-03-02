'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { createAuthenticatedBrowserClient } from '@/lib/supabase/client'
import { OldExamData, OldExamTask } from '@/types/old-exam'
import examDataJson from '@/app/data/mathematik_exam.json'

// Initialize tasks from JSON (outside component to avoid useEffect)
const initialTasks = (examDataJson as OldExamData).exam.tasks

export default function ExamStartPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const userId = session?.user?.id

  // Authentifizierter Supabase Client (Best Practice)
  const supabaseAccessToken = session?.supabaseAccessToken
  const supabase = useMemo(
    () => supabaseAccessToken ? createAuthenticatedBrowserClient(supabaseAccessToken) : null,
    [supabaseAccessToken]
  )

  const [tasks] = useState<OldExamTask[]>(initialTasks)
  const [currentTask, setCurrentTask] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [timer, setTimer] = useState(3600) // 60 minutes
  const [isSubmitting, setIsSubmitting] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const hasSubmittedRef = useRef(false)

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const saveAnswersForTask = async () => {
    if (!userId || !supabase) return

    const taskQuestions = tasks[currentTask]?.questions || []

    for (const question of taskQuestions) {
      const userAnswer = answers[question.id]
      if (userAnswer === undefined) continue

      const isCorrect = userAnswer.trim().toLowerCase() === question.solution.toLowerCase()

      try {
        const { data, error } = await supabase
          .from('user_exercises')
          .select('id')
          .eq('user_id', userId)
          .eq('question_id', question.id)
          .eq('exercise_type', 'exam')
          .single()

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching answer:', error)
          continue
        }

        if (data) {
          await supabase
            .from('user_exercises')
            .update({
              user_answer: userAnswer,
              is_correct: isCorrect,
              question: question.question,
            })
            .eq('id', data.id)
        } else {
          await supabase.from('user_exercises').insert({
            user_id: userId,
            exercise_type: 'exam',
            question_id: question.id,
            question: question.question,
            user_answer: userAnswer,
            is_correct: isCorrect,
          })
        }
      } catch (error) {
        console.error('Error saving answer:', error)
      }
    }
  }

  const handleAnswerChange = (questionId: number, answer: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }))
  }

  const handleNext = async () => {
    await saveAnswersForTask()
    if (currentTask < tasks.length - 1) {
      setCurrentTask((prev) => prev + 1)
    }
  }

  const handlePrevious = async () => {
    await saveAnswersForTask()
    if (currentTask > 0) {
      setCurrentTask((prev) => prev - 1)
    }
  }

  const handleSubmit = useCallback(async () => {
    if (hasSubmittedRef.current) return
    hasSubmittedRef.current = true
    
    setIsSubmitting(true)
    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    
    // Save all remaining answers
    if (userId && supabase) {
      for (const task of tasks) {
        for (const question of task.questions) {
          const userAnswer = answers[question.id]
          if (userAnswer === undefined) continue

          const isCorrect = userAnswer.trim().toLowerCase() === question.solution.toLowerCase()

          try {
            const { data } = await supabase
              .from('user_exercises')
              .select('id')
              .eq('user_id', userId)
              .eq('question_id', question.id)
              .eq('exercise_type', 'exam')
              .single()

            if (data) {
              await supabase
                .from('user_exercises')
                .update({
                  user_answer: userAnswer,
                  is_correct: isCorrect,
                  question: question.question,
                })
                .eq('id', data.id)
            } else {
              await supabase.from('user_exercises').insert({
                user_id: userId,
                exercise_type: 'exam',
                question_id: question.id,
                question: question.question,
                user_answer: userAnswer,
                is_correct: isCorrect,
              })
            }
          } catch (error) {
            console.error('Error saving answer:', error)
          }
        }
      }
    }

    router.push('/pruefung/abgabe')
  }, [userId, supabase, tasks, answers, router])

  // Timer countdown - check timer and auto-submit
  useEffect(() => {
    if (timer <= 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      handleSubmit()
      return
    }

    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          // Will trigger handleSubmit on next render
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [timer, handleSubmit])

  if (tasks.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  const currentTaskData = tasks[currentTask]
  const timerColor = timer < 300 ? 'text-red-600 dark:text-red-400' : timer < 600 ? 'text-orange-500 dark:text-orange-400' : 'text-muted-foreground'

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Timer Header */}
      <div className="sticky top-0 z-10 bg-card shadow-sm border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Aufgabe {currentTask + 1} von {tasks.length}
            </span>
            <div className="hidden sm:flex gap-1">
              {tasks.map((_, index) => (
                <div
                  key={index}
                  className={`w-3 h-3 rounded-full ${
                    index === currentTask
                      ? 'bg-primary'
                      : index < currentTask
                      ? 'bg-green-500'
                      : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </div>
          <div className={`font-mono text-2xl font-bold ${timerColor}`}>
            ⏱️ {formatTime(timer)}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-card rounded-2xl shadow-sm border border-border p-6 md:p-8">
          {/* Task Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {currentTaskData.title}
            </h2>
            <p className="text-muted-foreground">{currentTaskData.subtitle}</p>
          </div>

          {/* Questions */}
          <div className="space-y-6">
            {currentTaskData.questions.map((question, qIndex) => (
              <div
                key={question.id}
                className="p-4 bg-muted rounded-xl border border-border"
              >
                <label className="block mb-3">
                  <span className="font-medium text-foreground">
                    {String.fromCharCode(97 + qIndex)}) {question.question}
                  </span>
                  {question.formula && (
                    <p className="text-sm text-muted-foreground mt-1 font-mono bg-card p-2 rounded-lg border border-border">
                      {question.formula}
                    </p>
                  )}
                </label>
                <input
                  type="text"
                  value={answers[question.id] || ''}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-xl bg-card text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Deine Antwort..."
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentTask === 0}
            className="px-4 py-2 text-foreground border border-border rounded-xl hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Zurück
          </button>

          <div className="flex gap-3">
            {currentTask < tasks.length - 1 ? (
              <button
                onClick={handleNext}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90"
              >
                Weiter →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Wird abgegeben...' : '✓ Prüfung abgeben'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
