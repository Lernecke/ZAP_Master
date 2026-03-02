'use client'

import React from 'react'
import { Question } from '@/types/exam'
import MarkdownInline from './MarkdownInline'
import { Check, X } from 'lucide-react'

interface Props {
  question: Question
  value: Record<string, string>
  onChange: (val: Record<string, string>) => void
  showValidation: boolean
}

export default function TableQuestion({ question, value, onChange, showValidation }: Props) {
  const currentAnswers = value || {}

  const handleSelect = (rowId: string, colId: string) => {
    const newAnswers = { ...currentAnswers, [rowId]: colId }
    onChange(newAnswers)
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[600px] border-collapse">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-1/2">
              Aussage / Satz
            </th>
            {question.columns?.map((col) => (
              <th
                key={col.id}
                className="py-3 px-4 text-center text-sm font-bold text-gray-900 w-1/4"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {question.rows?.map((row) => {
            const selectedColId = currentAnswers[row.id]

            let rowStatus: 'correct' | 'incorrect' | null = null
            let correctColId: string | undefined = undefined

            if (showValidation && question.correctTableAnswers) {
              correctColId = question.correctTableAnswers[row.id]
              if (selectedColId === correctColId) {
                rowStatus = 'correct'
              } else if (selectedColId) {
                rowStatus = 'incorrect'
              }
            }

            return (
              <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                <td className="py-4 px-4 text-gray-800 font-medium">
                  <MarkdownInline text={row.text} />
                </td>

                {question.columns?.map((col) => {
                  const isSelected = selectedColId === col.id
                  const isCorrectForThisCell = showValidation && correctColId === col.id
                  const isWrongSelection = showValidation && isSelected && rowStatus === 'incorrect'

                  let ringClass = 'border-gray-300'
                  let bgClass = 'bg-white'
                  let icon = null

                  if (isSelected) {
                    ringClass = 'border-blue-500 ring-2 ring-blue-200'
                    bgClass = 'bg-blue-500'
                  }

                  if (showValidation) {
                    if (isCorrectForThisCell) {
                      ringClass = 'border-green-500 ring-2 ring-green-200'
                      bgClass = 'bg-green-500'
                      icon = <Check size={14} className="text-white" />
                    } else if (isWrongSelection) {
                      ringClass = 'border-red-500 ring-2 ring-red-200'
                      bgClass = 'bg-red-500'
                      icon = <X size={14} className="text-white" />
                    } else {
                      ringClass = 'border-gray-100'
                      bgClass = 'bg-gray-50'
                    }
                  }

                  return (
                    <td
                      key={col.id}
                      className="py-4 px-4 text-center cursor-pointer"
                      onClick={() => !showValidation && handleSelect(row.id, col.id)}
                    >
                      <div className="flex justify-center">
                        <div
                          className={`
                            w-6 h-6 rounded-full border transition-all flex items-center justify-center
                            ${ringClass} ${bgClass}
                          `}
                        >
                          {icon ? icon : isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                        </div>
                      </div>
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
