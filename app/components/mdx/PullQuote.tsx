import { ReactNode } from 'react'

interface PullQuoteProps {
  children: ReactNode
  attribution?: string
}

export default function PullQuote({ children, attribution }: PullQuoteProps) {
  return (
    <blockquote className="relative border-l-4 border-ink bg-subtle/30 rounded-r-sm px-6 py-5 my-8 italic">
      <div className="text-ink text-lg leading-relaxed [&>p]:mb-0">
        {children}
      </div>
      {attribution && (
        <footer className="mt-3 text-sm text-faint not-italic font-medium">
          — {attribution}
        </footer>
      )}
    </blockquote>
  )
}
