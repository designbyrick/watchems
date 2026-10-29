'use client'

import { useState } from 'react'
import { t, c } from '@/lib/styles'

interface FaqItem {
  question: string
  answer: string
}

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <div className={`${c.card} overflow-hidden divide-y divide-line`}>
      {items.map((item, idx) => (
        <div key={idx}>
          <button
            onClick={() => setOpen(open === idx ? null : idx)}
            aria-expanded={open === idx}
            className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left hover:bg-canvas transition-colors"
          >
            <h3 className={`${t.h3} leading-snug`}>{item.question}</h3>
            <span className={`shrink-0 text-faint transition-transform duration-200 ${open === idx ? 'rotate-180' : ''}`}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </button>
          {/* Answer always in DOM for SEO/LLM — hidden visually when closed */}
          <div
            className="overflow-hidden transition-all duration-200"
            style={{ maxHeight: open === idx ? '600px' : '0px' }}
          >
            <p className={`faq-answer ${t.body} leading-[1.75] px-6 pb-5`}>{item.answer}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
