'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// Values match the lowercase `watchStyle` / `dialColor` stored on photos
const STYLES = [
  { value: null, label: 'All', short: 'All' },
  { value: 'diver', label: 'Diver', short: 'Diver' },
  { value: 'dress', label: 'Dress', short: 'Dress' },
  { value: 'chronograph', label: 'Chronograph', short: 'Chrono' },
  { value: 'field', label: 'Field', short: 'Field' },
  { value: 'pilot', label: 'Pilot', short: 'Pilot' },
  { value: 'digital', label: 'Digital', short: 'Digital' },
] as const

const DIALS = [
  { value: 'black', label: 'Black', color: '#111213' },
  { value: 'blue', label: 'Blue', color: '#27466F' },
  { value: 'white', label: 'White', color: '#ECEBE6' },
  { value: 'gray', label: 'Grey', color: '#707376' },
  { value: 'champagne', label: 'Champagne', color: '#CDB48A' },
] as const

interface RangeOption {
  label: string
  params: Record<string, string | null>
}

// Size and price live in free-text columns the API can't range-filter yet,
// so only movement is offered here for now.
const MORE_GROUPS: { title: string; keys: string[]; options: RangeOption[] }[] = [
  {
    title: 'Movement',
    keys: ['movement'],
    options: [
      { label: 'Automatic', params: { movement: 'automatic' } },
      { label: 'Manual', params: { movement: 'manual' } },
      { label: 'Quartz', params: { movement: 'quartz' } },
    ],
  },
]

function optionActive(searchParams: URLSearchParams, option: RangeOption) {
  return Object.entries(option.params).every(([k, v]) => searchParams.get(k) === v)
}

export default function GalleryFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeStyle = searchParams.get('watchStyle')
  const activeDial = searchParams.get('dialColor')
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!moreOpen) return
    const onPointer = (e: PointerEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMoreOpen(false) }
    window.addEventListener('pointerdown', onPointer)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('keydown', onKey)
    }
  }, [moreOpen])

  function apply(update: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('open')
    for (const [k, v] of Object.entries(update)) {
      if (v === null) params.delete(k)
      else params.set(k, v)
    }
    const qs = params.toString()
    router.replace(qs ? `/?${qs}` : '/', { scroll: false })
  }

  const moreActiveCount = MORE_GROUPS.filter((g) => g.keys.some((k) => searchParams.has(k))).length

  return (
    <section
      aria-label="Filters"
      className="mt-4 sm:mt-10 flex flex-wrap items-center justify-between sm:justify-start gap-x-3 sm:gap-x-7 gap-y-3 sm:gap-y-4 pb-3 sm:pb-4 border-b border-line"
    >
      <div role="group" aria-label="Style" className="flex gap-5 sm:gap-[22px] overflow-x-auto scrollbar-hide flex-[1_1_100%] md:flex-[1_1_480px] min-w-0 -mx-4 px-4 sm:mx-0 sm:px-0">
        {STYLES.map((s) => {
          const active = (activeStyle ?? null) === s.value
          return (
            <button
              key={s.label}
              type="button"
              aria-pressed={active}
              onClick={() => apply({ watchStyle: s.value })}
              className={`shrink-0 h-11 text-[15px] sm:text-base transition-colors ${
                active ? 'text-ink font-semibold shadow-[inset_0_-2px_0_theme(colors.mark)]' : 'text-muted font-medium hover:text-ink'
              }`}
            >
              <span className="sm:hidden">{s.short}</span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          )
        })}
      </div>

      <div role="group" aria-label="Dial colour" className="flex items-center gap-1 sm:gap-1.5">
        <span className="font-mono text-[11px] tracking-[1px] uppercase text-muted mr-1.5">Dial</span>
        {DIALS.map((d) => {
          const active = activeDial === d.value
          return (
            <button
              key={d.value}
              type="button"
              aria-label={`${d.label} dial`}
              aria-pressed={active}
              title={d.label}
              onClick={() => apply({ dialColor: active ? null : d.value })}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full p-1 border-2 transition-colors ${active ? 'border-mark' : 'border-transparent hover:border-line-strong'}`}
            >
              <span
                className="block w-full h-full rounded-full shadow-[inset_0_0_0_1px_rgba(127,127,127,0.35)]"
                style={{ background: d.color }}
              />
            </button>
          )
        })}
      </div>

      <div ref={moreRef} className="relative">
        <button
          type="button"
          onClick={() => setMoreOpen((o) => !o)}
          aria-expanded={moreOpen}
          aria-haspopup="dialog"
          aria-label="Movement filter"
          className={`relative h-11 min-w-11 rounded-full border px-3 sm:px-4 flex items-center justify-center gap-2 text-sm font-medium text-ink transition-colors ${
            moreActiveCount > 0 ? 'border-ink' : 'border-line hover:border-line-strong'
          }`}
        >
          <svg className="w-[18px] h-[18px] sm:hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
            <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
            <circle cx="16" cy="7" r="2" />
            <circle cx="10" cy="17" r="2" />
          </svg>
          <span className="hidden sm:inline">Movement</span>
          {moreActiveCount > 0 && (
            <span className="absolute -top-1 -right-1 sm:static min-w-5 h-5 px-1.5 rounded-full bg-ink text-white font-mono text-[11px] flex items-center justify-center">
              {moreActiveCount}
            </span>
          )}
          <svg className={`hidden sm:block w-3.5 h-3.5 transition-transform ${moreOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {moreOpen && (
          <div
            role="dialog"
            aria-label="Movement"
            className="absolute z-40 top-full mt-2 right-0 w-[min(300px,calc(100vw-32px))] bg-surface border border-line rounded-xl shadow-md p-4 space-y-4"
          >
            {MORE_GROUPS.map((group) => (
              <div key={group.title}>
                <p className="font-mono text-[11px] tracking-[1px] uppercase text-muted mb-2">{group.title}</p>
                <div className="flex flex-wrap gap-1.5">
                  {group.options.map((option) => {
                    const active = optionActive(searchParams, option)
                    const cleared = Object.fromEntries(group.keys.map((k) => [k, null]))
                    return (
                      <button
                        key={option.label}
                        type="button"
                        aria-pressed={active}
                        onClick={() => apply(active ? cleared : { ...cleared, ...option.params })}
                        className={`h-9 px-3 rounded-full text-sm font-medium border transition-colors ${
                          active ? 'bg-ink border-ink text-white' : 'border-line text-ink hover:border-line-strong'
                        }`}
                      >
                        {option.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
            {moreActiveCount > 0 && (
              <button
                type="button"
                onClick={() => apply(Object.fromEntries(MORE_GROUPS.flatMap((g) => g.keys).map((k) => [k, null])))}
                className="text-sm font-medium text-muted hover:text-ink underline underline-offset-2"
              >
                Clear movement
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
