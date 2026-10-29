'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Fuse from 'fuse.js'
import { setWatchesCache } from '@/lib/watchesCache'
import type { WatchWithCount, BrandWithCount } from '@/lib/watchesCache'

interface FilterChip {
  key: string
  label: string
  param: string
  value: string
  // For price/case size range chips
  paramMin?: string
  paramMax?: string
  valueMin?: string
  valueMax?: string
}

// Filter chip data — hidden from UI for now, kept for future use
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const MOVEMENT_CHIPS: FilterChip[] = [
  { key: 'mv-automatic', label: 'Automatic', param: 'movement', value: 'automatic' },
  { key: 'mv-quartz', label: 'Quartz', param: 'movement', value: 'quartz' },
  { key: 'mv-manual', label: 'Manual', param: 'movement', value: 'manual' },
]

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const PRICE_CHIPS: FilterChip[] = [
  { key: 'price-0-500', label: 'Under $500', param: 'price', value: '0-500', paramMin: 'priceMin', paramMax: 'priceMax', valueMin: '0', valueMax: '500' },
  { key: 'price-500-2000', label: '$500\u2013$2K', param: 'price', value: '500-2000', paramMin: 'priceMin', paramMax: 'priceMax', valueMin: '500', valueMax: '2000' },
  { key: 'price-2000-5000', label: '$2K\u2013$5K', param: 'price', value: '2000-5000', paramMin: 'priceMin', paramMax: 'priceMax', valueMin: '2000', valueMax: '5000' },
  { key: 'price-5000-10000', label: '$5K\u2013$10K', param: 'price', value: '5000-10000', paramMin: 'priceMin', paramMax: 'priceMax', valueMin: '5000', valueMax: '10000' },
  { key: 'price-10000+', label: '$10K+', param: 'price', value: '10000+', paramMin: 'priceMin', paramMax: 'priceMax', valueMin: '10000', valueMax: '' },
]

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const SIZE_CHIPS: FilterChip[] = [
  { key: 'size-0-38', label: 'Under 38mm', param: 'caseSize', value: '0-38', paramMin: 'caseSizeMin', paramMax: 'caseSizeMax', valueMin: '0', valueMax: '38' },
  { key: 'size-38-42', label: '38\u201342mm', param: 'caseSize', value: '38-42', paramMin: 'caseSizeMin', paramMax: 'caseSizeMax', valueMin: '38', valueMax: '42' },
  { key: 'size-42+', label: '42mm+', param: 'caseSize', value: '42+', paramMin: 'caseSizeMin', paramMax: 'caseSizeMax', valueMin: '42', valueMax: '' },
]

const RECENT_SEARCHES_KEY = 'watchems-recent-searches'
const MAX_RECENT = 5

function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveRecentSearch(query: string) {
  if (typeof window === 'undefined' || !query.trim()) return
  try {
    const recent = getRecentSearches().filter((s) => s.toLowerCase() !== query.toLowerCase())
    recent.unshift(query.trim())
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)))
  } catch { /* ignore */ }
}

// Module-level cache for /api/photos/watches — backed by shared lib/watchesCache
type WatchesCache = {
  watches: WatchWithCount[]
  brands: BrandWithCount[]
  trending: string[]
  dialColors: { name: string; photoCount: number }[]
  watchStyles: { name: string; photoCount: number }[]
  caseMaterials: { name: string; photoCount: number }[]
  strapTypes: { name: string; photoCount: number }[]
  ts: number
}
let watchesCache: WatchesCache | null = null
const WATCHES_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export default function GallerySearch({ onExpandChange, placeholder = 'Brand, model or ref. 116600' }: { onExpandChange?: (expanded: boolean) => void; placeholder?: string } = {}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [watches, setWatches] = useState<WatchWithCount[]>([])
  const [brands, setBrands] = useState<BrandWithCount[]>([])
  const [trending, setTrending] = useState<string[]>([])
  const [input, setInput] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [isLoading, setIsLoading] = useState(true)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Notify parent when search expands/collapses
  useEffect(() => { onExpandChange?.(isOpen) }, [isOpen, onExpandChange])


  const activeWatchId = searchParams.get('watch')
  const activeQuery = searchParams.get('q')
  const activeBrand = searchParams.get('brand')
  const activeMovement = searchParams.get('movement')
  const activePriceMin = searchParams.get('priceMin')
  const activePriceMax = searchParams.get('priceMax')
  const activeCaseSizeMin = searchParams.get('caseSizeMin')
  const activeCaseSizeMax = searchParams.get('caseSizeMax')
  const activeDialColor = searchParams.get('dialColor')
  const activeWatchStyle = searchParams.get('watchStyle')

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isTypingRef = useRef(false)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Build current filter params (excluding q and watch)
  const buildFilterParams = useCallback(() => {
    const params = new URLSearchParams()
    if (activeBrand) params.set('brand', activeBrand)
    if (activeMovement) params.set('movement', activeMovement)
    if (activePriceMin) params.set('priceMin', activePriceMin)
    if (activePriceMax) params.set('priceMax', activePriceMax)
    if (activeCaseSizeMin) params.set('caseSizeMin', activeCaseSizeMin)
    if (activeCaseSizeMax) params.set('caseSizeMax', activeCaseSizeMax)
    if (activeDialColor) params.set('dialColor', activeDialColor)
    if (activeWatchStyle) params.set('watchStyle', activeWatchStyle)
    return params
  }, [activeBrand, activeMovement, activePriceMin, activePriceMax, activeCaseSizeMin, activeCaseSizeMax, activeDialColor, activeWatchStyle])

  // Debounced URL update for free-text search
  const updateQuery = useCallback((text: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const params = buildFilterParams()
      if (text.trim()) {
        params.set('q', text.trim())
        params.delete('watch')
      } else {
        params.delete('q')
      }
      // Preserve existing filters
      const qs = params.toString()
      router.replace(qs ? `/?${qs}` : '/')
    }, 150)
  }, [router, buildFilterParams])

  // Cleanup debounce and typing timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    }
  }, [])

  // Fetch watches with photos on mount (with module-level cache)
  useEffect(() => {
    const applyData = (data: WatchesCache) => {
      setWatches(data.watches)
      setBrands(data.brands)
      setTrending(data.trending)
      setIsLoading(false)
    }

    // Serve from cache immediately if fresh
    if (watchesCache && Date.now() - watchesCache.ts < WATCHES_CACHE_TTL) {
      applyData(watchesCache)
    }

    // Always revalidate in background
    fetch('/api/photos/watches')
      .then((res) => res.json())
      .then((data) => {
        const cached: WatchesCache = {
          watches: data.watches || [],
          brands: data.brands || [],
          trending: data.trending || [],
          dialColors: data.dialColors || [],
          watchStyles: data.watchStyles || [],
          caseMaterials: data.caseMaterials || [],
          strapTypes: data.strapTypes || [],
          ts: Date.now(),
        }
        watchesCache = cached
        setWatchesCache(cached) // push to shared cache for DidYouMean
        applyData(cached)
      })
      .catch((error) => {
        console.error('Failed to fetch watches:', error)
        if (!watchesCache) {
          setWatches([])
          setIsLoading(false)
        }
      })
  }, [])

  // Load recent searches on mount
  useEffect(() => {
    setRecentSearches(getRecentSearches())
  }, [])

  // When a watch or query is active, populate the input
  // Skip if user is actively typing (don't overwrite with stale URL value)
  useEffect(() => {
    if (isTypingRef.current) return
    if (activeWatchId) {
      const active = watches.find((w) => w.watchId === activeWatchId)
      if (active) {
        setInput(`${active.watchBrand ?? ''} ${active.watchName}`.trim())
      }
    } else if (activeQuery) {
      setInput(activeQuery)
    } else {
      setInput('')
    }
  }, [activeWatchId, activeQuery, watches])

  // Fuse.js indexes for fuzzy autocomplete
  const brandFuse = useMemo(() => {
    if (brands.length === 0) return null
    return new Fuse(brands, {
      keys: ['name'],
      threshold: 0.35,
      distance: 50,
      minMatchCharLength: 2,
    })
  }, [brands])

  const watchFuse = useMemo(() => {
    if (watches.length === 0) return null
    return new Fuse(watches, {
      keys: ['watchName', 'watchBrand', 'watchReference', 'watchId'],
      threshold: 0.35,
      distance: 100,
      minMatchCharLength: 2,
    })
  }, [watches])

  // Brand-level autocomplete grouping (fuzzy)
  const brandMatches = useMemo(() => {
    if (!input || !brandFuse) return []
    return brandFuse.search(input, { limit: 4 }).map((r) => r.item)
  }, [input, brandFuse])

  // Model-level matches (fuzzy, exclude brands to avoid duplicates)
  const modelMatches = useMemo(() => {
    if (!input || !watchFuse) return []
    const results = watchFuse.search(input, { limit: 10 }).map((r) => r.item)
    const brandNames = new Set(brandMatches.map((b) => b.name.toLowerCase()))
    return results
      .filter((w) => !brandNames.has((w.watchBrand ?? '').toLowerCase()) || results.length <= 4)
      .slice(0, 6)
  }, [input, watchFuse, brandMatches])

  // Total dropdown items for keyboard navigation
  const allDropdownItems = useMemo(() => {
    const result: ({ type: 'brand'; brand: BrandWithCount } | { type: 'model'; watch: WatchWithCount })[] = []
    for (const b of brandMatches) result.push({ type: 'brand', brand: b })
    for (const w of modelMatches) result.push({ type: 'model', watch: w })
    return result
  }, [brandMatches, modelMatches])

  // Show trending/recent when input is empty and dropdown is open
  const showTrending = isOpen && !input && !isLoading

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    window.addEventListener('pointerdown', handleClickOutside)
    return () => window.removeEventListener('pointerdown', handleClickOutside)
  }, [])

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const totalItems = showTrending
      ? trending.length + recentSearches.length
      : allDropdownItems.length

    if (!isOpen || totalItems === 0) {
      if (e.key === 'Enter' && input) {
        saveRecentSearch(input)
        setRecentSearches(getRecentSearches())
        setIsOpen(false)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : prev))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
        break
      case 'Enter':
        e.preventDefault()
        if (showTrending) {
          // Navigate trending/recent
          if (selectedIndex >= 0 && selectedIndex < trending.length) {
            handleTrendingClick(trending[selectedIndex])
          } else if (selectedIndex >= trending.length) {
            const recentIdx = selectedIndex - trending.length
            if (recentSearches[recentIdx]) {
              handleRecentClick(recentSearches[recentIdx])
            }
          }
        } else if (selectedIndex >= 0 && selectedIndex < allDropdownItems.length) {
          const item = allDropdownItems[selectedIndex]
          if (item.type === 'brand') {
            handleBrandSelect(item.brand.name)
          } else {
            selectWatch(item.watch)
          }
        } else if (allDropdownItems.length > 0) {
          const item = allDropdownItems[0]
          if (item.type === 'brand') {
            handleBrandSelect(item.brand.name)
          } else {
            selectWatch(item.watch)
          }
        } else if (input) {
          saveRecentSearch(input)
          setRecentSearches(getRecentSearches())
          setIsOpen(false)
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        break
    }
  }

  const selectWatch = (watch: WatchWithCount) => {
    saveRecentSearch(`${watch.watchBrand ?? ''} ${watch.watchName}`.trim())
    setRecentSearches(getRecentSearches())
    // open=1 tells the gallery to auto-open the lightbox for the first photo
    router.push(`/?watch=${encodeURIComponent(watch.watchId)}&open=1`)
    setIsOpen(false)
    setSelectedIndex(-1)
  }

  const handleBrandSelect = (brandName: string) => {
    saveRecentSearch(brandName)
    setRecentSearches(getRecentSearches())
    const params = buildFilterParams()
    params.set('brand', brandName.toLowerCase())
    params.delete('q')
    params.delete('watch')
    router.replace(`/?${params.toString()}`)
    setInput('')
    setIsOpen(false)
    setSelectedIndex(-1)
  }

  const handleTrendingClick = (brandName: string) => {
    saveRecentSearch(brandName)
    setRecentSearches(getRecentSearches())
    const params = buildFilterParams()
    params.set('brand', brandName.toLowerCase())
    params.delete('q')
    params.delete('watch')
    router.replace(`/?${params.toString()}`)
    setInput('')
    setIsOpen(false)
  }

  const handleRecentClick = (query: string) => {
    setInput(query)
    setIsOpen(false)
    const params = buildFilterParams()
    params.set('q', query)
    params.delete('watch')
    router.replace(`/?${params.toString()}`)
  }

  const clearFilter = () => {
    isTypingRef.current = false
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    // Clear the text search only — style/dial filters have their own controls
    const qs = buildFilterParams().toString()
    router.replace(qs ? `/?${qs}` : '/')
    setInput('')
    setIsOpen(false)
  }

  // Toggle a filter chip (hidden from UI for now)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const toggleChip = (chip: FilterChip) => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('watch')

    if (chip.param === 'movement') {
      if (activeMovement === chip.value) {
        params.delete('movement')
      } else {
        params.set('movement', chip.value)
      }
    } else if (chip.param === 'price') {
      const isActive = activePriceMin === chip.valueMin && activePriceMax === (chip.valueMax || null)
      if (isActive) {
        params.delete('priceMin')
        params.delete('priceMax')
      } else {
        if (chip.valueMin) params.set('priceMin', chip.valueMin)
        else params.delete('priceMin')
        if (chip.valueMax) params.set('priceMax', chip.valueMax)
        else params.delete('priceMax')
      }
    } else if (chip.param === 'caseSize') {
      const isActive = activeCaseSizeMin === chip.valueMin && activeCaseSizeMax === (chip.valueMax || null)
      if (isActive) {
        params.delete('caseSizeMin')
        params.delete('caseSizeMax')
      } else {
        if (chip.valueMin) params.set('caseSizeMin', chip.valueMin)
        else params.delete('caseSizeMin')
        if (chip.valueMax) params.set('caseSizeMax', chip.valueMax)
        else params.delete('caseSizeMax')
      }
    }

    const qs = params.toString()
    router.replace(qs ? `/?${qs}` : '/')
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const toggleBrandChip = (brandName: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('watch')
    if (activeBrand === brandName.toLowerCase()) {
      params.delete('brand')
    } else {
      params.set('brand', brandName.toLowerCase())
    }
    const qs = params.toString()
    router.replace(qs ? `/?${qs}` : '/')
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const isChipActive = (chip: FilterChip): boolean => {
    if (chip.param === 'movement') return activeMovement === chip.value
    if (chip.param === 'price') return activePriceMin === chip.valueMin && activePriceMax === (chip.valueMax || null)
    if (chip.param === 'caseSize') return activeCaseSizeMin === chip.valueMin && activeCaseSizeMax === (chip.valueMax || null)
    return false
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const brandChips = brands.slice(0, 8)

  return (
    <div ref={containerRef} className="relative">
      <form
        role="search"
        onSubmit={(e) => e.preventDefault()}
        className="flex items-center gap-2.5 sm:gap-3 h-12 sm:h-[60px] rounded-full bg-surface border border-line px-4 sm:px-[22px] focus-within:border-line-strong transition-colors"
      >
        <svg className="w-[17px] h-[17px] sm:w-[19px] sm:h-[19px] shrink-0 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <label htmlFor="gallery-search" className="sr-only">Search by brand, model or reference</label>
        <input
          id="gallery-search"
          ref={inputRef}
          type="search"
          placeholder={placeholder}
          value={input}
          onChange={(e) => {
            // Mark as typing, reset after 600ms of no input
            isTypingRef.current = true
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
            typingTimeoutRef.current = setTimeout(() => {
              isTypingRef.current = false
            }, 600)

            const val = e.target.value
            setInput(val)
            setIsOpen(true)
            setSelectedIndex(-1)
            updateQuery(val)
          }}
          onFocus={() => {
            setIsOpen(true)
            setRecentSearches(getRecentSearches())
          }}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          className="flex-1 min-w-0 bg-transparent border-0 text-base text-ink placeholder:text-faint focus:outline-none disabled:opacity-50 [&::-webkit-search-cancel-button]:hidden"
        />

        {/* Clear button — visible when there is a text search */}
        {(activeWatchId || activeQuery || input) && (
          <button
            type="button"
            onClick={clearFilter}
            className="shrink-0 -mr-2 w-9 h-9 flex items-center justify-center rounded-full text-muted hover:text-ink hover:bg-subtle transition-colors"
            aria-label="Clear search"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        )}
      </form>
    </div>
  )
}
