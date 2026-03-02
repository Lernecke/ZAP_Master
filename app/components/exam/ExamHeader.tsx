'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, BookOpen, RefreshCcw, CheckCircle, Trash2 } from 'lucide-react'

interface Props {
  title: string
  hasText: boolean
  isTextOpen: boolean
  setIsTextOpen: (v: boolean) => void
  showValidation: boolean
  setShowValidation: (v: boolean) => void
  onReset: () => void
}

export default function ExamHeader({
  title,
  hasText,
  isTextOpen,
  setIsTextOpen,
  showValidation,
  setShowValidation,
  onReset,
}: Props) {
  const router = useRouter()

  return (
    <header className="bg-card border-b border-border sticky top-0 z-40 px-4 py-3 flex items-center justify-between shadow-sm h-16">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/trainer')}
          className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-bold text-lg text-foreground hidden sm:block">{title}</h1>
        <span className="font-bold text-lg text-foreground sm:hidden">Prüfung</span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onReset}
          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors border border-transparent hover:border-red-500/20"
          title="Prüfung zurücksetzen"
        >
          <Trash2 size={20} />
        </button>

        <div className="w-px h-8 bg-border mx-1"></div>

        {hasText && (
          <button
            onClick={() => setIsTextOpen(!isTextOpen)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors border ${
              isTextOpen
                ? 'bg-primary/10 border-primary/20 text-primary'
                : 'bg-card border-border text-foreground hover:bg-muted'
            }`}
          >
            <BookOpen size={18} />
            <span className="hidden sm:inline">{isTextOpen ? 'Text schliessen' : 'Text'}</span>
          </button>
        )}

        <button
          onClick={() => setShowValidation(!showValidation)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
            showValidation
              ? 'bg-green-500/10 text-green-700 dark:text-green-400'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          }`}
        >
          {showValidation ? <RefreshCcw size={18} /> : <CheckCircle size={18} />}
          <span className="hidden sm:inline">{showValidation ? 'Weiter üben' : 'Korrigieren'}</span>
        </button>
      </div>
    </header>
  )
}
