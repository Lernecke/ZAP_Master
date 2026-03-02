'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { createAuthenticatedBrowserClient } from '@/lib/supabase/client'
import exercises from '@/app/data/mathematik_exercises.json'
import { InlineMath } from 'react-katex'
import { Calculator, CheckCircle2, XCircle, Lightbulb, RotateCcw } from 'lucide-react'
import type { ExerciseData } from '@/types/exercise'

// Type assertion for exercises
const exerciseData = exercises as ExerciseData

// Travel Table Component
const TravelTable = () => {
  return (
    <div className="overflow-x-auto my-6">
      <table className="min-w-full border-collapse border border-border text-center text-sm">
        <thead>
          <tr className="bg-primary">
            <th rowSpan={2} className="border border-border p-3 text-primary-foreground font-medium">
              Verkehrsmittel
            </th>
            <th colSpan={2} className="border border-border p-3 text-primary-foreground font-medium">
              Zürich – Paris
            </th>
            <th colSpan={2} className="border border-border p-3 text-primary-foreground font-medium">
              Zürich – Brüssel
            </th>
          </tr>
          <tr className="bg-primary/90">
            <th className="border border-border p-2 text-primary-foreground">Distanz</th>
            <th className="border border-border p-2 text-primary-foreground">Reisezeit</th>
            <th className="border border-border p-2 text-primary-foreground">Distanz</th>
            <th className="border border-border p-2 text-primary-foreground">Reisezeit</th>
          </tr>
        </thead>
        <tbody>
          <tr className="bg-card">
            <td className="border border-border p-2 font-medium text-foreground">Luftlinie</td>
            <td className="border border-border p-2 text-foreground">488 km</td>
            <td className="border border-border p-2 text-foreground">–</td>
            <td className="border border-border p-2 text-foreground">493 km</td>
            <td className="border border-border p-2 text-foreground">–</td>
          </tr>
          <tr className="bg-muted">
            <td className="border border-border p-2 font-medium text-foreground">Flugzeug</td>
            <td className="border border-border p-2 text-foreground">490 km</td>
            <td className="border border-border p-2 text-foreground">1 h 15 min</td>
            <td className="border border-border p-2 text-foreground">500 km</td>
            <td className="border border-border p-2 text-foreground">1 h 15 min</td>
          </tr>
          <tr className="bg-card">
            <td className="border border-border p-2 font-medium text-foreground">Zug</td>
            <td className="border border-border p-2 text-foreground">575 km</td>
            <td className="border border-border p-2 text-foreground">4 h 10 min</td>
            <td className="border border-border p-2 text-foreground">848 km</td>
            <td className="border border-border p-2 text-foreground">6 h 50 min</td>
          </tr>
          <tr className="bg-muted">
            <td className="border border-border p-2 font-medium text-foreground">Auto</td>
            <td className="border border-border p-2 text-foreground">640 km</td>
            <td className="border border-border p-2 text-foreground">6 h 40 min</td>
            <td className="border border-border p-2 text-foreground">632 km</td>
            <td className="border border-border p-2 text-foreground">7 h 15 min</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export default function MathematikPage() {
  const { data: session } = useSession()
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({})
  const [checked, setChecked] = useState(false)
  const [results, setResults] = useState<Record<number, boolean>>({})
  const [showHint, setShowHint] = useState<Record<number, boolean>>({})
  const [isSaving, setIsSaving] = useState(false)

  const userId = session?.user?.id

  // Authentifizierter Supabase Client (Best Practice)
  const supabaseAccessToken = session?.supabaseAccessToken
  const supabase = useMemo(
    () => supabaseAccessToken ? createAuthenticatedBrowserClient(supabaseAccessToken) : null,
    [supabaseAccessToken]
  )

  useEffect(() => {
    const fetchUserAnswers = async () => {
      if (!userId || !supabase) return
      
      const { data: savedAnswers, error } = await supabase
        .from('user_exercises')
        .select('*')
        .eq('user_id', userId)
        .eq('exercise_type', 'mathematik')

      if (!error && savedAnswers) {
        const answers: Record<number, string> = {}
        savedAnswers.forEach((answer) => {
          if (answer.question_id !== null) {
            answers[answer.question_id] = answer.user_answer || ''
          }
        })
        setUserAnswers(answers)
      }
    }

    fetchUserAnswers()
  }, [userId, supabase])

  const handleInputChange = (id: number, value: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [id]: value,
    }))
  }

  const handleCheckAnswers = async () => {
    const currentResults: Record<number, boolean> = {}
    setIsSaving(true)

    const aufgaben = exerciseData.uebungen.mathematik?.aufgaben || []

    for (const aufgabe of aufgaben) {
      for (const task of aufgabe.tasks) {
        const userAnswer = userAnswers[task.id] || ''
        let isCorrect = false

        if (task.type === 'bool') {
          isCorrect = userAnswer === task.solution
        } else {
          isCorrect = userAnswer.trim() === task.solution
        }

        currentResults[task.id] = isCorrect

        // Save to Supabase if logged in
        if (userId && supabase) {
          const { data } = await supabase
            .from('user_exercises')
            .select('id')
            .eq('user_id', userId)
            .eq('question_id', task.id)
            .eq('exercise_type', 'mathematik')
            .maybeSingle()

          if (data) {
            await supabase
              .from('user_exercises')
              .update({
                user_answer: userAnswer,
                is_correct: isCorrect,
                question: task.question,
              })
              .eq('id', data.id)
          } else {
            await supabase.from('user_exercises').insert({
              user_id: userId,
              exercise_type: 'mathematik',
              question_id: task.id,
              question: task.question,
              user_answer: userAnswer,
              is_correct: isCorrect,
            })
          }
        }
      }
    }

    setResults(currentResults)
    setChecked(true)
    setIsSaving(false)
  }

  const handleClearAll = async () => {
    if (userId && supabase) {
      await supabase
        .from('user_exercises')
        .delete()
        .eq('user_id', userId)
        .eq('exercise_type', 'mathematik')
    }

    setUserAnswers({})
    setChecked(false)
    setResults({})
    setShowHint({})
  }

  const toggleHint = (id: number) => {
    setShowHint((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  const aufgaben = exerciseData.uebungen.mathematik?.aufgaben || []
  const totalTasks = aufgaben.reduce((sum, a) => sum + a.tasks.length, 0)
  const correctCount = Object.values(results).filter(Boolean).length

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary/10 rounded-xl">
            <Calculator className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Mathematik Übungen</h1>
        </div>
        <p className="text-muted-foreground">
          Löse die Aufgaben und überprüfe deine Antworten.
        </p>
      </div>

      {/* Progress Bar (when checked) */}
      {checked && (
        <div className="bg-card rounded-2xl shadow-sm border border-border p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-foreground">Dein Ergebnis</span>
            <span className="text-lg font-bold text-primary">
              {correctCount} / {totalTasks} richtig
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-3">
            <div
              className="bg-primary h-3 rounded-full transition-all duration-500"
              style={{ width: `${(correctCount / totalTasks) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Exercises */}
      <div className="space-y-6">
        {aufgaben.map((aufgabe) => (
          <div key={aufgabe.id} className="bg-card rounded-2xl shadow-sm border border-border p-6">
            <h2 className="text-xl font-bold text-foreground mb-2">{aufgabe.title}</h2>
            {aufgabe.subtitle && (
              <p className="text-muted-foreground mb-4">{aufgabe.subtitle}</p>
            )}
            {aufgabe.table && <TravelTable />}

            <div className="space-y-4">
              {aufgabe.tasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-4 rounded-xl border ${
                    checked
                      ? results[task.id]
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-red-500/10 border-red-500/30'
                      : 'bg-muted border-border'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-foreground mb-2">{task.question}</p>
                      {task.formula && (
                        <div className="bg-card p-3 rounded-xl border border-border mb-3 overflow-x-auto">
                          <InlineMath math={task.formula} />
                        </div>
                      )}

                      {task.type === 'bool' ? (
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer text-foreground">
                            <input
                              type="radio"
                              name={`task-${task.id}`}
                              value="true"
                              checked={userAnswers[task.id] === 'true'}
                              onChange={(e) => handleInputChange(task.id, e.target.value)}
                              className="w-4 h-4 accent-primary"
                              disabled={checked}
                            />
                            <span>Richtig</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer text-foreground">
                            <input
                              type="radio"
                              name={`task-${task.id}`}
                              value="false"
                              checked={userAnswers[task.id] === 'false'}
                              onChange={(e) => handleInputChange(task.id, e.target.value)}
                              className="w-4 h-4 accent-primary"
                              disabled={checked}
                            />
                            <span>Falsch</span>
                          </label>
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={userAnswers[task.id] || ''}
                          onChange={(e) => handleInputChange(task.id, e.target.value)}
                          placeholder="Deine Antwort..."
                          className="w-full max-w-xs px-3 py-2 border border-border rounded-xl bg-card text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                          disabled={checked}
                        />
                      )}

                      {/* Result indicator */}
                      {checked && (
                        <div className="mt-2 flex items-center gap-2">
                          {results[task.id] ? (
                            <span className="flex items-center gap-1 text-green-600 text-sm">
                              <CheckCircle2 className="w-4 h-4" />
                              Richtig!
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-red-600 text-sm">
                              <XCircle className="w-4 h-4" />
                              Falsch. Lösung: <strong>{task.solution}</strong>
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Hint button */}
                    {task.hint && !checked && (
                      <button
                        onClick={() => toggleHint(task.id)}
                        className="p-2 text-yellow-600 dark:text-yellow-500 hover:bg-yellow-500/10 rounded-xl transition-colors"
                        title="Hinweis anzeigen"
                      >
                        <Lightbulb className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  {/* Hint display */}
                  {showHint[task.id] && task.hint && (
                    <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-yellow-700 dark:text-yellow-400 text-sm">
                      💡 {task.hint}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex flex-wrap gap-4">
        {!checked ? (
          <button
            onClick={handleCheckAnswers}
            disabled={isSaving}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Speichern...' : 'Antworten überprüfen'}
          </button>
        ) : (
          <button
            onClick={handleClearAll}
            className="flex items-center gap-2 px-6 py-3 bg-muted text-foreground rounded-xl font-medium hover:bg-muted/80 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Neu starten
          </button>
        )}
      </div>
    </div>
  )
}
