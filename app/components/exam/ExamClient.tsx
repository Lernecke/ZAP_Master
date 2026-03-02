'use client'

import React, { useState } from 'react'
import { Exam } from '@/types/exam'
import { useProgress } from '@/context/ProgressContext'
import ExamHeader from './ExamHeader'
import MetaInfo from './MetaInfo'
import QuestionCard from './QuestionCard'
import TextSidebar from './TextSidebar'

interface Props {
  exam: Exam
}

export default function ExamClient({ exam }: Props) {
  const { updateAnswer, getAnswer, resetExam } = useProgress()

  const [showValidation, setShowValidation] = useState(false)
  // Initialize isTextOpen based on subject (German exams start with sidebar open on desktop)
  const [isTextOpen, setIsTextOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768 && exam.subject === 'German'
    }
    return false
  })

  const handleInputChange = (
    questionId: string,
    subTaskId: string | undefined,
    val: string | number | Record<string, string>
  ) => {
    const key = subTaskId ? `${questionId}-${subTaskId}` : questionId
    updateAnswer(exam.id, key, val)
  }

  const getValue = (questionId: string, subTaskId?: string) => {
    const key = subTaskId ? `${questionId}-${subTaskId}` : questionId
    return (getAnswer(exam.id, key) as string | number) || ''
  }

  const handleReset = () => {
    if (
      confirm(
        'Möchtest du diese Prüfung wirklich zurücksetzen? Alle deine Antworten gehen verloren.'
      )
    ) {
      resetExam(exam.id)
      setShowValidation(false)
    }
  }

  const hasText: boolean =
    exam.subject === 'German' && Boolean(exam.textLines && exam.textLines.length > 0)

  return (
    <div className="min-h-screen bg-background flex flex-col text-foreground font-sans">
      <ExamHeader
        title={exam.title}
        hasText={hasText}
        isTextOpen={isTextOpen}
        setIsTextOpen={setIsTextOpen}
        showValidation={showValidation}
        setShowValidation={setShowValidation}
        onReset={handleReset}
      />

      <div className="flex-1 flex flex-col md:flex-row items-start relative w-full">
        <main
          className={`flex-1 p-4 md:p-8 transition-all duration-300 ease-in-out ${
            hasText && isTextOpen ? 'w-full md:w-1/2' : 'w-full max-w-5xl mx-auto'
          }`}
        >
          <div className="space-y-6">
            {exam.meta && <MetaInfo meta={exam.meta} />}
            {exam.questions.map((q) => (
              <QuestionCard
                key={q.id}
                question={q}
                getValue={getValue}
                onInputChange={handleInputChange}
                showValidation={showValidation}
              />
            ))}
          </div>
          <div className="h-32"></div>
        </main>

        {hasText && (
          <TextSidebar
            textLines={exam.textLines || []}
            isOpen={isTextOpen}
            onClose={() => setIsTextOpen(false)}
          />
        )}
      </div>
    </div>
  )
}
