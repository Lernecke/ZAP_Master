'use client'

import React from 'react'
import { ChevronRight, AlertCircle } from 'lucide-react'

interface Props {
  textLines?: string[]
  isOpen: boolean
  onClose: () => void
}

export default function TextSidebar({ textLines, isOpen, onClose }: Props) {
  const visibilityClass = isOpen
    ? 'translate-x-0 md:translate-x-0 md:w-1/2 md:block opacity-100'
    : 'translate-x-full md:translate-x-0 md:hidden opacity-0 md:opacity-100'

  return (
    <aside
      className={`
        fixed inset-y-0 right-0 z-50 w-full bg-card border-l border-border shadow-2xl transition-all duration-300 ease-in-out
        md:shadow-none md:relative md:inset-auto md:z-0
        md:sticky md:top-20 md:h-[calc(100vh-5rem)] md:overflow-y-auto
        ${visibilityClass}
      `}
    >
      <div className="h-full flex flex-col bg-yellow-500/5">
        <div className="p-4 border-b border-border bg-card flex items-center justify-between md:hidden sticky top-0 z-10">
          <span className="font-bold text-foreground">Lesetext</span>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full text-muted-foreground">
            <ChevronRight />
          </button>
        </div>

        <div className="flex-1 p-6 md:p-8">
          <div className="bg-card p-6 md:p-10 rounded-2xl shadow-sm border border-border min-h-[50vh]">
            <h2 className="text-2xl font-bold mb-6 text-foreground border-b border-border pb-4">
              Lesetext Beilage
            </h2>

            {textLines && textLines.length > 0 ? (
              <div className="font-serif text-lg leading-relaxed text-foreground">
                {textLines.map((line, index) => {
                  const lineNumber = index + 1
                  const showNumber = lineNumber % 5 === 0 || lineNumber === 1
                  return (
                    <div
                      key={index}
                      className="flex gap-4 hover:bg-yellow-500/10 transition-colors rounded px-2 -mx-2 group"
                    >
                      <span
                        className={`
                          w-8 text-right shrink-0 select-none text-xs mt-1.5 text-muted-foreground group-hover:text-foreground
                          ${showNumber ? 'font-bold text-foreground opacity-100' : 'opacity-0 group-hover:opacity-100'}
                        `}
                      >
                        {lineNumber}
                      </span>
                      <p className="m-0 break-words w-full">{line}</p>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-muted-foreground py-10 text-center">
                <AlertCircle size={48} className="mb-4 text-yellow-500/50" />
                <p className="font-medium">Kein Text gefunden.</p>
              </div>
            )}
          </div>
          <div className="h-20 md:hidden"></div>
        </div>
      </div>
    </aside>
  )
}
