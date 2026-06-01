'use client'

import 'katex/dist/katex.min.css'
import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'

interface Props {
  text: string
  className?: string
}

export default function MarkdownInline({ text, className = '' }: Props) {
  if (!text) return null

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p: ({ children }) => <span>{children}</span>,
          br: () => <br />,
          strong: ({ children }) => <span className="font-bold">{children}</span>,
          em: ({ children }) => <span className="italic">{children}</span>,
          table: ({ children }) => (
            <table className="border-collapse border border-gray-300 my-2 text-sm">{children}</table>
          ),
          th: ({ children }) => (
            <th className="border border-gray-300 px-2 py-1 bg-gray-100 font-bold">{children}</th>
          ),
          td: ({ children }) => <td className="border border-gray-300 px-2 py-1">{children}</td>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  )
}
