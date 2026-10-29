'use client'

import { useEffect, useRef, useState } from 'react'

interface NavItem {
  id: string
  label: string
}

interface Props {
  items: NavItem[]
  maxWidth?: string
}

export function GuideSubnav({ items, maxWidth = 'max-w-3xl' }: Props) {
  const [active, setActive] = useState<string>(items[0]?.id ?? '')
  const navRef = useRef<HTMLElement>(null)
  const activeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const observers: IntersectionObserver[] = []

    // Track which sections are currently intersecting and pick the topmost one
    const visible = new Map<string, number>() // id → top position

    items.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (!el) return

      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            visible.set(id, entry.boundingClientRect.top)
          } else {
            visible.delete(id)
          }
          if (visible.size > 0) {
            // Pick the section whose top edge is closest to (but below) 0
            const sorted = Array.from(visible.entries()).sort((a, b) => a[1] - b[1])
            setActive(sorted[0][0])
          }
        },
        {
          rootMargin: '-20% 0px -60% 0px',
          threshold: 0,
        }
      )

      obs.observe(el)
      observers.push(obs)
    })

    return () => observers.forEach((o) => o.disconnect())
  }, [items])

  // Keep the active pill scrolled into view inside the subnav
  useEffect(() => {
    activeButtonRef.current?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [active])

  function scrollTo(id: string) {
    const el = document.getElementById(id)
    if (!el) return
    const mainNavHeight = window.innerWidth >= 640 ? 64 : 56
    const subNavHeight = navRef.current?.offsetHeight ?? 44
    const y = el.getBoundingClientRect().top + window.scrollY - mainNavHeight - subNavHeight - 4
    window.scrollTo({ top: y, behavior: 'smooth' })
  }

  return (
    <nav
      ref={navRef}
      aria-label="Guide sections"
      className="sticky top-14 sm:top-16 z-20 border-b border-line bg-surface/90 backdrop-blur-sm overflow-x-auto scrollbar-hide"
    >
      <div className={`${maxWidth} mx-auto px-4 sm:px-6 flex items-center gap-0.5 py-2`}>
        {items.map(({ id, label }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              ref={isActive ? activeButtonRef : undefined}
              onClick={() => scrollTo(id)}
              aria-current={isActive ? 'location' : undefined}
              className={[
                'text-xs font-medium rounded-full px-3.5 py-1.5 whitespace-nowrap transition-all shrink-0',
                isActive
                  ? 'text-ink bg-canvas border border-line-strong'
                  : 'text-faint hover:text-muted border border-transparent',
              ].join(' ')}
            >
              {label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
