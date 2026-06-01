'use client'

import { useRouter } from 'next/navigation'
import { useMemo } from 'react'
import { createAuthenticatedBrowserClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/useAuthStore'

interface Props {
  hasExamAnswers: boolean
}

export function PruefungsButtonsClient({ hasExamAnswers }: Props) {
  const router = useRouter()
  const { userId, supabaseAccessToken } = useAuthStore()
  const supabase = useMemo(
    () => supabaseAccessToken ? createAuthenticatedBrowserClient(supabaseAccessToken) : null,
    [supabaseAccessToken]
  )

  const handleStartExam = async () => {
    if (userId && supabase) {
      const { error } = await supabase
        .from('user_exercises')
        .delete()
        .eq('user_id', userId)
        .eq('exercise_type', 'exam')

      if (error) {
        console.error('Error deleting previous answers:', error)
        return
      }
    }
    router.push('/pruefung/start')
  }

  const handleViewExam = () => {
    router.push('/pruefung/abgabe')
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      {!hasExamAnswers ? (
        <button
          onClick={handleStartExam}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-medium text-lg flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
          </svg>
          Prüfung starten
        </button>
      ) : (
        <>
          <button
            onClick={handleStartExam}
            className="px-6 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-medium text-lg flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            Prüfung neu starten
          </button>
          <button
            onClick={handleViewExam}
            className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium text-lg flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Ergebnisse anzeigen
          </button>
        </>
      )}
    </div>
  )
}
