'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { createAuthenticatedBrowserClient } from '@/lib/supabase/client'
import type { Json } from '@/types/database'

interface ProgressContextType {
  answers: Record<string, unknown>
  updateAnswer: (examId: string, questionKey: string, value: unknown) => void
  getAnswer: (examId: string, questionKey: string) => unknown
  resetExam: (examId: string) => void
  saveToDatabase: (examId: string) => Promise<void>
  isLoading: boolean
}

const ProgressContext = createContext<ProgressContextType | undefined>(undefined)

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [isLoaded, setIsLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Authentifizierter Supabase Client (Best Practice)
  const supabaseAccessToken = session?.supabaseAccessToken
  const supabase = useMemo(
    () => supabaseAccessToken ? createAuthenticatedBrowserClient(supabaseAccessToken) : null,
    [supabaseAccessToken]
  )

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('zap-progress')
    if (saved) {
      try {
        setAnswers(JSON.parse(saved))
      } catch (e) {
        console.error('Fehler beim Laden des Fortschritts', e)
      }
    }
    setIsLoaded(true)
  }, [])

  // Save to localStorage when answers change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('zap-progress', JSON.stringify(answers))
    }
  }, [answers, isLoaded])

  const loadFromDatabase = useCallback(async () => {
    if (!session?.user?.id || !supabase) return

    try {
      const { data, error } = await supabase
        .from('trainer_progress')
        .select('exam_id, answers')
        .eq('user_id', session.user.id)

      if (error) {
        // Nur loggen wenn es kein "Tabelle existiert nicht" Fehler ist
        if (!error.message?.includes('does not exist') && error.code !== '42P01') {
          console.warn('Progress loading skipped:', error.message)
        }
        return
      }

      if (data && data.length > 0) {
        const dbAnswers: Record<string, unknown> = {}
        data.forEach((progress) => {
          const examAnswers = progress.answers as Record<string, unknown>
          if (examAnswers) {
            Object.entries(examAnswers).forEach(([key, value]) => {
              dbAnswers[`${progress.exam_id}-${key}`] = value
            })
          }
        })

        // Merge with existing localStorage (localStorage takes precedence for newer answers)
        setAnswers((prev) => ({ ...dbAnswers, ...prev }))
      }
    } catch (e) {
      console.error('Failed to load progress from database:', e)
    }
  }, [session?.user?.id, supabase])

  // Load from database when session becomes available
  useEffect(() => {
    if (session?.user?.id && supabase && isLoaded) {
      loadFromDatabase()
    }
  }, [session?.user?.id, supabase, isLoaded, loadFromDatabase])

  const updateAnswer = useCallback((examId: string, questionKey: string, value: unknown) => {
    setAnswers((prev) => ({
      ...prev,
      [`${examId}-${questionKey}`]: value,
    }))
  }, [])

  const getAnswer = useCallback(
    (examId: string, questionKey: string) => {
      return answers[`${examId}-${questionKey}`]
    },
    [answers]
  )

  const resetExam = useCallback((examId: string) => {
    setAnswers((prev) => {
      const newAnswers = { ...prev }
      Object.keys(newAnswers).forEach((key) => {
        if (key.startsWith(`${examId}-`)) {
          delete newAnswers[key]
        }
      })
      return newAnswers
    })
  }, [])

  const saveToDatabase = useCallback(
    async (examId: string) => {
      if (!session?.user?.id || !supabase) return

      setIsLoading(true)
      try {
        // Extract answers for this exam
        const examAnswers: Record<string, unknown> = {}
        Object.entries(answers).forEach(([key, value]) => {
          if (key.startsWith(`${examId}-`)) {
            const questionKey = key.replace(`${examId}-`, '')
            examAnswers[questionKey] = value
          }
        })

        const { error } = await supabase.from('trainer_progress').upsert(
          {
            user_id: session.user.id,
            exam_id: examId,
            answers: examAnswers as Json,
            last_updated: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,exam_id',
          }
        )

        if (error) {
          console.error('Error saving progress:', error)
        }
      } catch (e) {
        console.error('Failed to save progress to database:', e)
      } finally {
        setIsLoading(false)
      }
    },
    [session?.user?.id, supabase, answers]
  )

  return (
    <ProgressContext.Provider
      value={{ answers, updateAnswer, getAnswer, resetExam, saveToDatabase, isLoading }}
    >
      {children}
    </ProgressContext.Provider>
  )
}

export function useProgress() {
  const context = useContext(ProgressContext)
  if (context === undefined) {
    throw new Error('useProgress must be used within a ProgressProvider')
  }
  return context
}
