'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { brandPath } from '@/lib/brandSlug'

interface Brand {
  brandName: string
  photoCount: number
}

export default function BrandList({ brands }: { brands: Brand[] }) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? brands.filter((b) => b.brandName.toLowerCase().includes(q)) : brands
  }, [brands, query])

  // Group filtered brands alphabetically
  const grouped = useMemo(() => {
    const map = new Map<string, Brand[]>()
    for (const brand of filtered) {
      const letter = brand.brandName[0].toUpperCase()
      if (!map.has(letter)) map.set(letter, [])
      map.get(letter)!.push(brand)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  return (
    <>
      {/* Search */}
      <div className="mt-6 relative w-full max-w-sm">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="search"
          aria-label="Search brands"
          placeholder="Search brands"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full h-11 pl-10 pr-10 rounded-full border border-line bg-surface text-[15px] text-ink placeholder:text-faint focus:outline-none focus:border-ink [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-muted hover:text-ink hover:bg-subtle"
            aria-label="Clear search"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        )}
      </div>

      {/* Results count when filtering */}
      {query && (
        <p className="mt-4 font-mono text-xs tracking-[1px] uppercase text-muted">
          {filtered.length} brand{filtered.length !== 1 ? 's' : ''} matching &ldquo;{query}&rdquo;
        </p>
      )}

      {/* Alphabetical list */}
      {grouped.length > 0 ? (
        <div className="mt-8 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {grouped.map(([letter, letterBrands]) => (
            <section key={letter} aria-label={letter} className="min-w-0">
              <h2 className="pb-2.5 border-b border-line font-mono text-xs tracking-[1px] uppercase text-muted">{letter}</h2>
              <ul>
                {letterBrands.map((brand) => (
                  <li key={brand.brandName}>
                    <Link
                      href={brandPath(brand.brandName)}
                      className="group flex items-center justify-between gap-4 py-3.5 px-1 border-b border-line hover:bg-[#FAFAF9] transition-colors"
                    >
                      <span className="text-[17px] font-semibold text-ink truncate">{brand.brandName}</span>
                      <span className="flex items-center gap-3 shrink-0 font-mono text-[13px] text-muted">
                        {brand.photoCount}<span className="sr-only"> wrist shots</span>
                        <svg className="text-ink" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <p className="mt-8 text-[15px] text-muted">No brands found.</p>
      )}
    </>
  )
}
