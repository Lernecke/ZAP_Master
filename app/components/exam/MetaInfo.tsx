'use client'

import React, { useState } from 'react'
import { ChevronDown, ChevronUp, Info, Clock } from 'lucide-react'
import { ExamMeta } from '@/types/exam'

interface Props {
  meta: ExamMeta
}

export default function MetaInfo({ meta }: Props) {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-primary/20 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between bg-primary/5 hover:bg-primary/10 transition-colors"
      >
        <div className="flex items-center gap-3 text-foreground font-medium">
          <Info size={20} className="text-primary" />
          <span>Prüfungsinformationen</span>
        </div>
        {isOpen ? (
          <ChevronUp size={20} className="text-primary/60" />
        ) : (
          <ChevronDown size={20} className="text-primary/60" />
        )}
      </button>

      {isOpen && (
        <div className="px-6 py-4 border-t border-primary/10 grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Hinweise
            </h4>
            <ul className="space-y-1">
              {meta.hints.map((hint, idx) => (
                <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                  <span className="mt-1.5 w-1 h-1 rounded-full bg-primary block shrink-0" />
                  {hint}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-3">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Zeit
              </h4>
              <div className="flex items-center gap-2 text-foreground font-medium">
                <Clock size={16} className="text-muted-foreground" />
                {meta.time || '60 Min'}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Max. Punkte
              </h4>
              <div className="text-foreground font-medium">{meta.maxPoints} Punkte</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
