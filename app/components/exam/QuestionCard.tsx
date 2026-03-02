'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { Question } from '@/types/exam'
import MarkdownInline from './MarkdownInline'
import TableQuestion from './TableQuestion'
import { InputTask, MultipleChoiceTask, TextAreaTask } from './TaskInputs'

interface Props {
  question: Question
  getValue: (qId: string, tId?: string) => string | number
  onInputChange: (qId: string, tId: string | undefined, val: string | number) => void
  showValidation: boolean
}

export default function QuestionCard({ question, getValue, onInputChange, showValidation }: Props) {
  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border p-6 md:p-8">
      <div className="flex gap-4 mb-6">
        <span className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-muted text-foreground rounded-full font-bold text-lg">
          {question.number}
        </span>
        <div className="pt-1">
          <h3 className="text-xl font-bold text-foreground">
            <MarkdownInline text={question.prompt} />
          </h3>
        </div>
      </div>

      {question.imageUrl && (
        <div className="ml-0 md:ml-14 mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={question.imageUrl}
            alt={`Aufgabe ${question.number}`}
            className="rounded-xl border border-border shadow-sm max-w-full h-auto object-contain"
            style={{ maxHeight: '350px' }}
          />
        </div>
      )}

      {question.context && (
        <div className="ml-0 md:ml-14 mb-8 p-5 bg-muted rounded-xl border border-border text-foreground text-base leading-relaxed overflow-x-auto">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={{
              strong: ({ children }) => <span className="font-bold text-foreground">{children}</span>,
              ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 my-2">{children}</ul>,
              li: ({ children }) => <li className="pl-1">{children}</li>,
              p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
              table: ({ children }) => (
                <table className="w-full border-collapse border border-border my-4 text-sm">
                  {children}
                </table>
              ),
              thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
              tr: ({ children }) => (
                <tr className="border-b border-border last:border-0">{children}</tr>
              ),
              th: ({ children }) => (
                <th className="border border-border px-4 py-2 text-left font-bold text-foreground">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="border border-border px-4 py-2">{children}</td>
              ),
            }}
          >
            {question.context}
          </ReactMarkdown>
        </div>
      )}

      <div className="pl-0 md:pl-14 space-y-10">
        {question.type === 'input' &&
          question.subTasks?.map((task) => (
            <InputTask
              key={task.id}
              task={task}
              questionId={question.id}
              value={getValue(question.id, task.id) as string}
              onChange={(val) => onInputChange(question.id, task.id, val)}
              showValidation={showValidation}
            />
          ))}

        {question.type === 'multiple-choice' &&
          question.subTasks?.map((task) => (
            <MultipleChoiceTask
              key={task.id}
              task={task}
              questionId={question.id}
              value={getValue(question.id, task.id) as string}
              onChange={(val) => onInputChange(question.id, task.id, val)}
              showValidation={showValidation}
            />
          ))}

        {question.type === 'text-area' &&
          question.subTasks?.map((task) => (
            <TextAreaTask
              key={task.id}
              task={task}
              questionId={question.id}
              value={getValue(question.id, task.id) as string}
              onChange={(val) => onInputChange(question.id, task.id, val)}
              showValidation={showValidation}
            />
          ))}

        {question.type === 'table-select' && (
          <TableQuestion
            question={question}
            value={getValue(question.id) as unknown as Record<string, string>}
            onChange={(val) => onInputChange(question.id, undefined, val as unknown as string)}
            showValidation={showValidation}
          />
        )}
      </div>
    </div>
  )
}
