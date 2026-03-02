'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Bot, BadgeCheck, ChevronDown } from 'lucide-react'
import { Exam } from '@/types/exam'

interface Props {
  year: number
  subject: 'Math' | 'German'
  variants: Exam[]
  icon: React.ReactNode
  colorClass: string
}

export default function ExamGroupCard({ year, subject, variants, icon, colorClass }: Props) {
  const sortedVariants = [...variants].sort((a, b) => {
    const isOfficialA = !a.generatedBy || a.generatedBy === 'Official'
    const isOfficialB = !b.generatedBy || b.generatedBy === 'Official'
    if (isOfficialA && !isOfficialB) return -1
    if (!isOfficialA && isOfficialB) return 1
    return 0
  })

  const [selectedExamId, setSelectedExamId] = useState(sortedVariants[0].id)

  const selectedExam = sortedVariants.find((e) => e.id === selectedExamId) || sortedVariants[0]
  const isOfficial = !selectedExam.generatedBy || selectedExam.generatedBy === 'Official'

  const badgeColor = isOfficial
    ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
    : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
  const badgeIcon = isOfficial ? <BadgeCheck size={14} /> : <Bot size={14} />

  return (
    <div className="bg-card rounded-2xl border border-border p-6 shadow-sm hover:shadow-md transition-all duration-200 h-full flex flex-col relative group">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl ${colorClass}`}>{icon}</div>
        <span className="text-sm font-bold text-muted-foreground bg-muted px-2 py-1 rounded-md border border-border">
          {year}
        </span>
      </div>
      <h3 className="text-lg font-bold text-foreground mb-1">
        {subject === 'German' ? 'Deutsch' : 'Mathematik'} {year}
      </h3>
      <p className="text-sm text-muted-foreground mb-6">
        {subject === 'German' ? '(Sprachprüfung)' : '(Langgymnasium)'}
      </p>
      <div className="mt-auto space-y-3">
        <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
          Version wählen:
        </label>
        <div className="relative">
          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="w-full appearance-none bg-muted border border-border text-foreground text-sm rounded-xl focus:ring-primary focus:border-primary block p-2.5 pr-8 font-medium cursor-pointer hover:bg-muted/80 transition-colors outline-none"
          >
            {sortedVariants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.generatedBy || 'Official'}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
            <ChevronDown size={16} />
          </div>
        </div>

        <div className="flex items-center justify-between mt-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${badgeColor}`}
          >
            {badgeIcon}
            {selectedExam.generatedBy || 'Original'}
          </span>
          <span className="text-xs text-muted-foreground">{selectedExam.questions.length} Aufgaben</span>
        </div>
        <Link
          href={`/trainer/${selectedExamId}`}
          className="mt-4 flex items-center justify-center w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-bold py-3 px-4 rounded-xl transition-all"
        >
          Lernen
          <ChevronRight size={16} />
        </Link>
      </div>
    </div>
  )
}
