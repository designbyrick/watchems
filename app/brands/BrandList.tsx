'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

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
      <div className="relative mb-8">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Search brands..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full max-w-sm pl-9 pr-4 h-10 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute left-[calc(max(100%,_theme(maxWidth.sm))_-_2rem)] top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg font-semibold"
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>

      {/* Results count when filtering */}
      {query && (
        <p className="text-xs text-gray-400 mb-4">
          {filtered.length} brand{filtered.length !== 1 ? 's' : ''} matching &ldquo;{query}&rdquo;
        </p>
      )}

      {/* Alphabetical list */}
      {grouped.length > 0 ? (
        <div className="space-y-6">
          {grouped.map(([letter, letterBrands]) => (
            <div key={letter}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">{letter}</p>
              <div className="divide-y divide-gray-50">
                {letterBrands.map((brand) => (
                  <Link
                    key={brand.brandName}
                    href={`/brand/${encodeURIComponent(brand.brandName.toLowerCase())}`}
                    className="flex items-center justify-between py-2.5 hover:text-ink transition-colors group"
                  >
                    <span className="text-sm font-medium text-gray-800 group-hover:text-ink transition-colors">
                      {brand.brandName}
                    </span>
                    <span className="text-xs text-gray-400">
                      {brand.photoCount} photo{brand.photoCount !== 1 ? 's' : ''}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400">No brands found.</p>
      )}
    </>
  )
}
