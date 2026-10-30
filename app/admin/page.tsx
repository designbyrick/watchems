'use client'

import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'

const SECTIONS = [
  {
    href: '/admin/photos',
    label: 'Photos',
    title: 'Photo moderation',
    description: 'Review, edit watch metadata, and approve community-submitted photos.',
  },
  {
    href: '/admin/reviews',
    label: 'Reviews',
    title: 'Review moderation',
    description: 'Approve or reject written reviews before they go live.',
  },
] as const

export default function AdminDashboard() {
  const { userId } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!userId) {
      router.push('/sign-in')
      return
    }
  }, [userId, router])

  if (!userId) {
    return null
  }

  return (
    <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-8 pb-16">
      <h1 className="text-[32px] sm:text-[40px] leading-tight font-semibold tracking-[-0.04em] text-ink">Admin</h1>
      <p className="mt-2 text-[15px] text-muted">Moderation tools for Watchems.</p>

      <div className="mt-7 grid gap-3 sm:grid-cols-2 max-w-[720px]">
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group block bg-surface border border-line rounded-[10px] p-5 hover:border-line-strong transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
          >
            <p className="font-mono text-[11px] tracking-[1px] uppercase text-muted">{s.label}</p>
            <h2 className="mt-1.5 text-lg font-semibold text-ink">{s.title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">{s.description}</p>
            <span className="mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-[15px] font-semibold text-white group-hover:bg-ink-hover transition-colors">
              Open
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
