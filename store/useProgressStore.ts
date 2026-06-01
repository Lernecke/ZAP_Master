import { create } from 'zustand'
import { createAuthenticatedBrowserClient } from '@/lib/supabase/client'
import type { Json } from '@/types/database'

// Module-level debounce map — safe because the store is a singleton
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>()

interface ProgressState {
  // Public interface (same contract as old ProgressContext)
  answers: Record<string, unknown>
  isLoading: boolean
  updateAnswer: (examId: string, questionKey: string, value: unknown) => void
  getAnswer: (examId: string, questionKey: string) => unknown
  resetExam: (examId: string) => void
  saveToDatabase: (examId: string) => Promise<void>

  // Called by ProgressStoreSync to inject auth credentials
  _userId: string | null
  _supabaseAccessToken: string | null
  setAuthData: (userId: string | null, token: string | null) => void
  loadFromDatabase: () => Promise<void>
}

export const useProgressStore = create<ProgressState>((set, get) => ({
  answers: {},
  isLoading: false,
  _userId: null,
  _supabaseAccessToken: null,

  setAuthData: (userId, token) => set({ _userId: userId, _supabaseAccessToken: token }),

  updateAnswer: (examId, questionKey, value) => {
    set((state) => ({
      answers: { ...state.answers, [`${examId}-${questionKey}`]: value },
    }))

    // Persist to localStorage after each change
    const { answers } = get()
    localStorage.setItem('zap-progress', JSON.stringify(answers))

    // Debounced auto-save to Supabase (1 second)
    const { _supabaseAccessToken } = get()
    if (_supabaseAccessToken) {
      const existing = debounceTimers.get(examId)
      if (existing) clearTimeout(existing)
      const timer = setTimeout(() => {
        useProgressStore.getState().saveToDatabase(examId)
        debounceTimers.delete(examId)
      }, 1000)
      debounceTimers.set(examId, timer)
    }
  },

  getAnswer: (examId, questionKey) => get().answers[`${examId}-${questionKey}`],

  resetExam: (examId) => {
    set((state) => {
      const newAnswers = { ...state.answers }
      Object.keys(newAnswers).forEach((key) => {
        if (key.startsWith(`${examId}-`)) delete newAnswers[key]
      })
      return { answers: newAnswers }
    })
    localStorage.setItem('zap-progress', JSON.stringify(get().answers))
  },

  saveToDatabase: async (examId) => {
    const { _userId, _supabaseAccessToken, answers } = get()
    if (!_userId || !_supabaseAccessToken) return

    const supabase = createAuthenticatedBrowserClient(_supabaseAccessToken)
    set({ isLoading: true })
    try {
      const examAnswers: Record<string, unknown> = {}
      Object.entries(answers).forEach(([key, value]) => {
        if (key.startsWith(`${examId}-`)) {
          examAnswers[key.replace(`${examId}-`, '')] = value
        }
      })

      const { error } = await supabase.from('trainer_progress').upsert(
        {
          user_id: _userId,
          exam_id: examId,
          answers: examAnswers as Json,
          last_updated: new Date().toISOString(),
        },
        { onConflict: 'user_id,exam_id' }
      )

      if (error) console.error('Error saving progress:', error)
    } catch (e) {
      console.error('Failed to save progress to database:', e)
    } finally {
      set({ isLoading: false })
    }
  },

  loadFromDatabase: async () => {
    const { _userId, _supabaseAccessToken } = get()
    if (!_userId || !_supabaseAccessToken) return

    const supabase = createAuthenticatedBrowserClient(_supabaseAccessToken)
    try {
      const { data, error } = await supabase
        .from('trainer_progress')
        .select('exam_id, answers')
        .eq('user_id', _userId)

      if (error) {
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
        // DB answers are the base; current (localStorage) answers take precedence
        set((state) => ({ answers: { ...dbAnswers, ...state.answers } }))
      }
    } catch (e) {
      console.error('Failed to load progress from database:', e)
    }
  },
}))
