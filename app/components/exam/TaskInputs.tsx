'use client'

import React from 'react'
import { SubTask } from '@/types/exam'
import MarkdownInline from './MarkdownInline'
import { validateInput } from '@/lib/utils/examUtils'

interface TaskProps {
  task: SubTask
  questionId: string
  value: string | number
  onChange: (val: string) => void
  showValidation: boolean
}

export function InputTask({ task, value, onChange, showValidation }: TaskProps) {
  const status = showValidation ? validateInput(value, task.correctAnswer) : null

  return (
    <div className="group">
      <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
        <div className="text-foreground font-bold min-w-[25px] pt-1 text-lg">
          <MarkdownInline text={task.label} />
        </div>
        <div className="flex-1 w-full">
          {task.prompt && (
            <div className="text-foreground mb-3 text-base leading-snug font-medium">
              <MarkdownInline text={task.prompt} />
            </div>
          )}
          {task.imageUrl && (
            <div className="mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={task.imageUrl}
                alt=""
                className="rounded-xl border border-border shadow-sm max-w-full h-auto"
                style={{ maxHeight: '250px' }}
              />
            </div>
          )}

          <div className="flex items-center gap-3">
            <input
              type="text"
              className={`
                border-2 rounded-xl px-4 py-2.5 w-full sm:w-48 outline-none transition-all font-medium text-foreground placeholder-muted-foreground text-lg bg-card
                ${!status && 'border-border focus:border-primary focus:ring-4 focus:ring-primary/10'}
                ${status === 'correct' ? 'bg-green-500/10 border-green-500 text-green-800 dark:text-green-300' : ''}
                ${status === 'incorrect' ? 'bg-red-500/10 border-red-400 text-red-800 dark:text-red-300' : ''}
              `}
              placeholder="Antwort"
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              disabled={showValidation && status === 'correct'}
            />
            {task.suffix && (
              <span className="text-muted-foreground font-medium shrink-0 mt-1">{task.suffix}</span>
            )}
          </div>

          {showValidation && (
            <div className="mt-3 animate-in fade-in slide-in-from-top-1">
              {status === 'incorrect' && task.correctAnswer && (
                <div className="text-sm text-red-600 dark:text-red-400 font-bold">Lösung: {task.correctAnswer}</div>
              )}
              {task.modelAnswer && (
                <div className="bg-primary/10 border border-primary/20 p-3 rounded-xl text-foreground mt-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary mb-1 block">
                    Musterlösung
                  </span>
                  <div className="text-sm">
                    <MarkdownInline text={task.modelAnswer} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function MultipleChoiceTask({ task, questionId, value, onChange, showValidation }: TaskProps) {
  return (
    <div className="group border-b border-border last:border-0 pb-6 mb-6 last:mb-0">
      <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
        <div className="text-foreground font-bold min-w-[25px] pt-1 text-lg">
          <MarkdownInline text={task.label} />
        </div>

        <div className="flex-1 w-full">
          <div className="flex flex-col md:flex-row md:gap-8">
            <div className="md:w-1/2 mb-4 md:mb-0">
              <div className="text-foreground text-base font-medium leading-relaxed mb-4">
                <MarkdownInline text={task.prompt} />
              </div>

              {task.imageUrl && (
                <div className="mb-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={task.imageUrl}
                    alt=""
                    className="rounded-xl border border-border shadow-sm max-w-full h-auto"
                    style={{ maxHeight: '250px' }}
                  />
                </div>
              )}

              {showValidation && task.modelAnswer && (
                <div className="bg-primary/10 border border-primary/20 p-3 rounded-xl text-foreground mt-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary mb-1 block">
                    Erklärung
                  </span>
                  <div className="text-sm">
                    <MarkdownInline text={task.modelAnswer} />
                  </div>
                </div>
              )}
            </div>

            <div className="md:w-1/2 space-y-2">
              {task.options?.map((opt) => {
                const isSelected = value === opt
                const isCorrectAnswer = showValidation && task.correctAnswer === opt
                const isWrongSelection = showValidation && isSelected && !isCorrectAnswer

                let containerClass = 'border-border hover:bg-muted hover:border-primary/50'
                if (isSelected) containerClass = 'bg-primary/10 border-primary ring-1 ring-primary'

                if (showValidation) {
                  if (isCorrectAnswer)
                    containerClass = 'bg-green-500/10 border-green-500 ring-1 ring-green-500'
                  else if (isWrongSelection)
                    containerClass = 'bg-red-500/10 border-red-400 ring-1 ring-red-400'
                  else containerClass = 'opacity-50 border-border'
                }

                return (
                  <label
                    key={opt}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${containerClass}`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center bg-card shrink-0 ${
                        isSelected || isCorrectAnswer ? 'border-primary' : 'border-muted-foreground/30'
                      }`}
                    >
                      {(isSelected || isCorrectAnswer) && (
                        <div
                          className={`w-2.5 h-2.5 rounded-full ${
                            isCorrectAnswer
                              ? 'bg-green-600'
                              : isWrongSelection
                                ? 'bg-red-500'
                                : 'bg-primary'
                          }`}
                        />
                      )}
                    </div>
                    <input
                      type="radio"
                      name={`${questionId}-${task.id}`}
                      value={opt}
                      checked={isSelected}
                      onChange={() => !showValidation && onChange(opt)}
                      className="hidden"
                      disabled={showValidation}
                    />
                    <span
                      className={`text-sm ${isCorrectAnswer ? 'font-bold text-green-700 dark:text-green-400' : 'text-foreground'}`}
                    >
                      {opt}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function TextAreaTask({ task, value, onChange, showValidation }: TaskProps) {
  const status = showValidation && task.correctAnswer ? validateInput(value, task.correctAnswer) : null

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <span className="font-bold text-foreground text-lg">{task.label}</span>
        <div className="text-foreground font-medium text-base pt-0.5">
          <MarkdownInline text={task.prompt} />
        </div>
      </div>
      <textarea
        className={`
          w-full border-2 rounded-xl p-4 h-32 outline-none resize-none transition-all text-foreground text-base placeholder-muted-foreground bg-card
          ${!status && 'border-border focus:border-primary focus:ring-4 focus:ring-primary/10'}
          ${status === 'correct' ? 'bg-green-500/10 border-green-500 text-green-800 dark:text-green-300' : ''}
          ${status === 'incorrect' ? 'bg-red-500/10 border-red-400 text-red-800 dark:text-red-300' : ''}
        `}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Schreibe deine Antwort hier..."
        disabled={showValidation && status === 'correct'}
      />

      {showValidation && (
        <div className="animate-in fade-in slide-in-from-top-1">
          {status === 'incorrect' && task.correctAnswer && (
            <div className="text-sm text-red-600 dark:text-red-400 font-bold">Lösung: {task.correctAnswer}</div>
          )}
          {task.modelAnswer && (
            <div className="bg-primary/10 border border-primary/20 p-3 rounded-xl text-foreground mt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-primary mb-1 block">
                Musterlösung
              </span>
              <div className="text-sm">
                <MarkdownInline text={task.modelAnswer} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
