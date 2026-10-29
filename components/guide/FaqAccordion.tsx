'use client'

import { useState } from 'react'

interface FaqItem {
  question: string
  answer: string
}

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <div className="rounded-[10px] border border-line bg-surface overflow-hidden divide-y divide-line">
      {items.map((item, idx) => (
        <div key={idx}>
          <button
            onClick={() => setOpen(open === idx ? null : idx)}
            aria-expanded={open === idx}
            className="w-full flex items-center justify-between gap-4 px-5 sm:px-6 py-[18px] text-left hover:bg-canvas transition-colors"
          >
            <h3 className="text-base font-semibold text-ink leading-snug">{item.question}</h3>
            <span className={`shrink-0 text-muted transition-transform duration-200 ${open === idx ? 'rotate-180' : ''}`}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </button>
          {/* Answer always in DOM for SEO/LLM — hidden visually when closed */}
          <div
            className="overflow-hidden transition-all duration-200"
            style={{ maxHeight: open === idx ? '600px' : '0px' }}
          >
            <p className="faq-answer text-[15px] text-muted leading-[1.7] px-5 sm:px-6 pb-5">{item.answer}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
