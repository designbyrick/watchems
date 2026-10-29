'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Fuse from 'fuse.js'
import type { Watch } from '@/lib/types'

interface SearchFormProps {
  placeholder?: string
  watches: Watch[]
  comparisons: { slug1: string; slug2: string }[]
}

interface Result {
  type: 'watch' | 'comparison'
  label: string
  href: string
}

export function SearchForm({
  placeholder = 'Search watches or comparisons...',
  watches,
  comparisons,
}: SearchFormProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)

  const watchMap = useMemo(() => {
    const map = new Map<string, Watch>()
    watches.forEach((w) => map.set(w.slug, w))
    return map
  }, [watches])

  // Build Fuse indexes once
  const { watchFuse, compFuse } = useMemo(() => {
    const watchItems = watches.map((w) => ({
      type: 'watch' as const,
      label: `${w.brand} ${w.name}`,
      href: `/watches/${w.slug}`,
    }))

    const compItems = comparisons
      .map((c) => {
        const wa = watchMap.get(c.slug1)
        const wb = watchMap.get(c.slug2)
        if (!wa || !wb) return null
        return {
          type: 'comparison' as const,
          label: `${wa.brand} ${wa.name} vs ${wb.brand} ${wb.name}`,
          href: `/compare/${c.slug1}-vs-${c.slug2}`,
        }
      })
      .filter(Boolean) as Result[]

    const fuseOptions = {
      keys: ['label'],
      threshold: 0.4,
      distance: 100,
      minMatchCharLength: 2,
    }

    return {
      watchFuse: new Fuse(watchItems, fuseOptions),
      compFuse: new Fuse(compItems, fuseOptions),
    }
  }, [watches, comparisons, watchMap])

  const results = useMemo((): Result[] => {
    const q = query.trim()
    if (q.length < 2) return []

    const watchResults = watchFuse.search(q, { limit: 5 }).map((r) => r.item)
    const compResults = compFuse.search(q, { limit: 5 }).map((r) => r.item)

    return [...watchResults, ...compResults].slice(0, 8)
  }, [query, watchFuse, compFuse])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(-1)
  }, [results])

  const navigate = (href: string) => {
    setOpen(false)
    setQuery('')
    router.push(href)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIndex >= 0 && results[activeIndex]) {
        navigate(results[activeIndex].href)
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative max-w-xl mx-auto mb-8">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
            }}
            onFocus={() => query.length >= 2 && setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full bg-canvas border border-line-strong rounded-sm px-4 py-2.5 text-sm text-ink placeholder:text-faint focus:outline-none focus:border-ink transition-colors"
          />
          <svg
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-faint"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-surface border border-line-strong rounded-sm shadow-lg overflow-hidden max-h-[60vh] overflow-y-auto">
          {results.map((r, i) => (
            <button
              key={r.href}
              type="button"
              onClick={() => navigate(r.href)}
              className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors ${
                i === activeIndex ? 'bg-subtle' : 'hover:bg-canvas'
              }`}
            >
              <span className={`shrink-0 w-5 h-5 rounded-sm flex items-center justify-center text-[10px] font-bold ${
                r.type === 'comparison'
                  ? 'bg-ink text-white'
                  : 'bg-canvas border border-line-strong text-faint'
              }`}>
                {r.type === 'comparison' ? 'VS' : 'W'}
              </span>
              <p className="text-sm text-ink truncate">{r.label}</p>
            </button>
          ))}
        </div>
      )}

      {open && query.length >= 2 && results.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-surface border border-line-strong rounded-sm shadow-lg p-4 text-center">
          <p className="text-sm text-faint">No watches or comparisons found</p>
        </div>
      )}
    </div>
  )
}
