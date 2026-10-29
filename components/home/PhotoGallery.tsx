'use client'

import React, { useState, useEffect, useRef, useCallback, Suspense, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { buildPhotoAltText } from '@/lib/photoAlt'
import SaveToBoard from '@/components/SaveToBoard'
import GalleryFilters from './GalleryFilters'
import Fuse from 'fuse.js'
import EmptyState from '@/components/ui/EmptyState'
import { getWatchesCacheSync, getWatchesData } from '@/lib/watchesCache'
import { trackEvent } from '@/lib/gtag'

interface PhotoItem {
  id: string
  slug?: string | null
  watchId: string
  userId: string
  url: string
  thumbnailUrl?: string | null
  userName: string
  isOfficial?: boolean
  createdAt: string
  watchSlug?: string
  watchName?: string
  watchBrand?: string
  watchReference?: string
  brandName?: string | null
  modelName?: string | null
  referenceNumber?: string | null
  movement?: string | null
  caseSize?: string | null
  wristSize?: string | null
  estimatedPrice?: string | null
  lugToLug?: string | null
  betweenLugs?: string | null
  thickness?: string | null
  waterResistance?: string | null
  sortOrder?: number
}

interface PhotosResponse {
  photos: PhotoItem[]
  nextCursor: string | null
  totalCount: number | null
  suggestions?: string[]
}

interface WatchGroup {
  key: string
  watchId: string
  photos: PhotoItem[]
}

const PAGE_SIZE = 20

/**
 * Merge new photos into an existing list, skipping any whose id is already present.
 * This guards against races between the filter-change effect
 * and IntersectionObserver load-more, both of which append to the same state.
 */
function mergePhotosDedupe(prev: PhotoItem[], next: PhotoItem[]): PhotoItem[] {
  if (next.length === 0) return prev
  const seen = new Set(prev.map((p) => p.id))
  const additions = next.filter((p) => !seen.has(p.id))
  return additions.length > 0 ? [...prev, ...additions] : prev
}

function groupByWatch(photos: PhotoItem[]): WatchGroup[] {
  const map = new Map<string, PhotoItem[]>()
  for (const photo of photos) {
    // Group by watchId+userId so different users' uploads stay separate
    const key = `${photo.watchId}::${photo.userId}`
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(photo)
  }
  return Array.from(map.entries()).map(([key, photos]) => ({
    key,
    watchId: photos[0].watchId,
    photos: [...photos].sort((a, b) => {
      const orderDiff = (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
      if (orderDiff !== 0) return orderDiff
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    }),
  }))
}

function getWatchLabel(group: WatchGroup) {
  const p = group.photos[0]
  const brand = p.brandName || p.watchBrand || null
  const model = p.modelName || p.watchName || null
  const ref = p.referenceNumber || p.watchReference || null
  return { brand, model, ref }
}

function TileGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-[repeat(auto-fill,minmax(232px,1fr))] sm:gap-x-5 sm:gap-y-9">
      {children}
    </div>
  )
}

function TileSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="aspect-[4/5] rounded-md bg-subtle animate-pulse" />
      <div className="mt-3 h-2.5 w-16 rounded bg-subtle animate-pulse" />
      <div className="mt-2 h-3.5 w-3/4 rounded bg-subtle animate-pulse" />
    </div>
  )
}

function unslugify(slug: string) {
  return slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

const POPULAR_BRANDS = ['Rolex', 'Omega', 'Seiko', 'Tudor', 'Hamilton']

function DidYouMean({ query, serverSuggestions, onSearch, onBrand }: {
  query: string | null
  serverSuggestions?: string[]
  onSearch: (q: string) => void
  onBrand: (b: string) => void
}) {
  const suggestions = useMemo(() => {
    if (!query) return []
    const combined: string[] = []

    // Server-side suggestions (from pg_trgm similarity on actual photos)
    if (serverSuggestions?.length) {
      combined.push(...serverSuggestions)
    }

    // Client-side Fuse.js against the shared watches cache
    const cached = getWatchesCacheSync()
    if (cached && cached.watches.length > 0) {
      const fuse = new Fuse(cached.watches, {
        keys: ['watchName', 'watchBrand'],
        threshold: 0.5, // more permissive for "did you mean"
      })
      const clientMatches = fuse.search(query, { limit: 5 }).map((r) =>
        [r.item.watchBrand, r.item.watchName].filter(Boolean).join(' ')
      )
      combined.push(...clientMatches)
    }

    // Deduplicate (case-insensitive) and limit
    const seen = new Set<string>()
    return combined.filter((s) => {
      const key = s.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    }).slice(0, 5)
  }, [query, serverSuggestions])

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {/* Heading */}
      <h2 className="text-xl font-bold text-ink mb-1">No results found</h2>
      {query && (
        <p className="text-sm text-muted mb-6">
          No photos match &lsquo;{query}&rsquo;
        </p>
      )}

      {/* Upload CTA — main focus */}
      <div className="border-2 border-dashed border-gray-300 rounded-2xl px-10 py-12 max-w-md w-full mb-8">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-5">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5V19a1.5 1.5 0 001.5 1.5h15A1.5 1.5 0 0021 19v-2.5M16 8l-4-4-4 4M12 4v12" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-ink mb-2">Own this watch?</h3>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          {query
            ? <>No one has shared a <span className="font-semibold text-ink">{query}</span> yet. Be the first to add it to the community gallery.</>
            : 'No one has shared this watch yet. Be the first to add it to the community gallery.'}
        </p>
        <a
          href="/upload"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 hover:bg-gray-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Upload a photo
        </a>
      </div>

      {/* Did you mean */}
      {suggestions.length > 0 && (
        <div className="mb-6">
          <p className="text-sm text-gray-500 mb-2">Did you mean:</p>
          <div className="flex gap-2 justify-center flex-wrap">
            {suggestions.map((s) => (
              <button key={s} type="button" onClick={() => onSearch(s)} className="text-blue-600 hover:text-blue-800 text-sm font-medium underline">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Popular searches — secondary */}
      <div>
        <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide font-medium">Popular searches</p>
        <div className="flex gap-2 justify-center flex-wrap">
          {POPULAR_BRANDS.map((brand) => (
            <button
              key={brand}
              type="button"
              onClick={() => onBrand(brand)}
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-white text-gray-700 border border-gray-300 hover:border-gray-400 transition-colors"
            >
              {brand}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function PhotoGalleryContent({ userId }: { userId?: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeWatchId = searchParams.get('watch')
  const activeQuery = searchParams.get('q')
  const autoOpen = searchParams.get('open') === '1'
  const activeBrand = searchParams.get('brand')
  const activeMovement = searchParams.get('movement')
  const activePriceMin = searchParams.get('priceMin')
  const activePriceMax = searchParams.get('priceMax')
  const activeCaseSizeMin = searchParams.get('caseSizeMin')
  const activeCaseSizeMax = searchParams.get('caseSizeMax')
  const activeDialColor = searchParams.get('dialColor')
  const activeWatchStyle = searchParams.get('watchStyle')
  const activeCaseMaterial = searchParams.get('caseMaterial')
  const activeStrapType = searchParams.get('strapType')

  const hasActiveSearch = !!(activeQuery || activeWatchId || activeBrand || activeMovement || activePriceMin || activePriceMax || activeCaseSizeMin || activeCaseSizeMax || activeDialColor || activeWatchStyle || activeCaseMaterial || activeStrapType)

  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState<number | null>(null)
  const [suggestions, setSuggestions] = useState<string[] | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Warm the shared watches cache — DidYouMean reads it for fuzzy suggestions
  useEffect(() => {
    if (!getWatchesCacheSync()) getWatchesData().catch(() => {})
  }, [])

  // Abort controller for cancelling stale fetches
  const abortRef = useRef<AbortController | null>(null)

  const fetchPhotos = useCallback(async (cursor?: string, signal?: AbortSignal) => {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE) })
    if (cursor) params.set('cursor', cursor)
    if (activeWatchId) params.set('watchId', activeWatchId)
    if (activeQuery) params.set('q', activeQuery)
    if (activeBrand) params.set('brand', activeBrand)
    if (activeMovement) params.set('movement', activeMovement)
    if (activePriceMin) params.set('priceMin', activePriceMin)
    if (activePriceMax) params.set('priceMax', activePriceMax)
    if (activeCaseSizeMin) params.set('caseSizeMin', activeCaseSizeMin)
    if (activeCaseSizeMax) params.set('caseSizeMax', activeCaseSizeMax)
    if (activeDialColor) params.set('dialColor', activeDialColor)
    if (activeWatchStyle) params.set('watchStyle', activeWatchStyle)
    if (activeCaseMaterial) params.set('caseMaterial', activeCaseMaterial)
    if (activeStrapType) params.set('strapType', activeStrapType)
    if (userId) params.set('userId', userId)
    const res = await fetch(`/api/photos/all?${params.toString()}`, { signal })
    const data: PhotosResponse = await res.json()
    return data
  }, [activeWatchId, activeQuery, activeBrand, activeMovement, activePriceMin, activePriceMax, activeCaseSizeMin, activeCaseSizeMax, activeDialColor, activeWatchStyle, activeCaseMaterial, activeStrapType, userId])

  const groups = useMemo(() => groupByWatch(photos), [photos])

  useEffect(() => {
    // Debounce rapid filter changes (e.g. clicking multiple chips quickly)
    const timer = setTimeout(() => {
      // Abort any in-flight request before starting a new one
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setLoading(true)
      setPhotos([])
      setNextCursor(null)
      setTotalCount(null)
      setSuggestions(undefined)

      fetchPhotos(undefined, controller.signal).then((data) => {
        if (!controller.signal.aborted) {
          setPhotos(data.photos)
          setNextCursor(data.nextCursor)
          setTotalCount(data.totalCount)
          setSuggestions(data.suggestions)
          setLoading(false)

          // Track search/filter interactions — only when user has applied something
          const hasFilter = !!(activeQuery || activeWatchId || activeBrand || activeMovement || activePriceMin || activePriceMax || activeCaseSizeMin || activeCaseSizeMax || activeDialColor || activeWatchStyle || activeCaseMaterial || activeStrapType)
          if (hasFilter) {
            trackEvent('search', {
              search_term: activeQuery ?? activeWatchId ?? activeBrand ?? null,
              brand: activeBrand ?? null,
              watch_id: activeWatchId ?? null,
              movement: activeMovement ?? null,
              dial_color: activeDialColor ?? null,
              watch_style: activeWatchStyle ?? null,
              case_material: activeCaseMaterial ?? null,
              strap_type: activeStrapType ?? null,
              result_count: data.totalCount ?? data.photos.length,
            })
          }
        }
      }).catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        if (!controller.signal.aborted) setLoading(false)
      })
    }, 100)

    return () => {
      clearTimeout(timer)
      abortRef.current?.abort()
    }
  }, [fetchPhotos, activeWatchId, activeQuery, activeBrand, activeMovement, activePriceMin, activePriceMax, activeCaseSizeMin, activeCaseSizeMax, activeDialColor, activeWatchStyle, activeCaseMaterial, activeStrapType])

  useEffect(() => {
    if (!sentinelRef.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && nextCursor && !loadingMore) {
          setLoadingMore(true)
          fetchPhotos(nextCursor).then((data) => {
            setPhotos((prev) => mergePhotosDedupe(prev, data.photos))
            setNextCursor(data.nextCursor)
            setLoadingMore(false)
          }).catch(() => setLoadingMore(false))
        }
      },
      { rootMargin: '400px' }
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [nextCursor, loadingMore, fetchPhotos])


  // A dropdown selection (?open=1) goes straight to the first matching photo page
  useEffect(() => {
    if (!autoOpen || loading || groups.length === 0) return
    const first = groups[0].photos[0]
    router.replace(`/photo/${first.slug ?? first.id}`)
  }, [autoOpen, loading, groups, router])


  const selectedWatchName = activeWatchId && photos.length > 0
    ? photos[0].watchBrand && photos[0].watchName
      ? `${photos[0].watchBrand} ${photos[0].watchName}`
      : photos[0].watchName ?? activeWatchId
    : null

  return (
    <section className={userId ? 'pb-8' : 'max-w-[1320px] mx-auto px-4 sm:px-8 pb-16 sm:pb-[72px]'}>
      {/* Style tabs + dial swatches + more filters (home gallery only) */}
      {!userId && <GalleryFilters />}

      {/* Count row */}
      {!userId && (
        <div className="flex justify-between items-baseline gap-4 my-4 sm:my-5 font-mono text-[11px] sm:text-xs tracking-[1px] uppercase text-muted">
          <span aria-live="polite">
            {loading || totalCount === null
              ? '\u00a0'
              : activeWatchId && selectedWatchName
                ? `${totalCount} wrist shot${totalCount !== 1 ? 's' : ''} · ${selectedWatchName}`
                : activeQuery
                  ? `${totalCount} result${totalCount !== 1 ? 's' : ''} for \u201c${activeQuery}\u201d`
                  : `${totalCount} wrist shot${totalCount !== 1 ? 's' : ''}`}
          </span>
          <span><span className="sm:hidden">Newest</span><span className="hidden sm:inline">Newest first</span></span>
        </div>
      )}

      {/* Gallery grid — uniform 4:5 tiles */}
      {loading ? (
        <TileGrid>
          {Array.from({ length: 12 }).map((_, i) => <TileSkeleton key={i} />)}
        </TileGrid>
      ) : groups.length === 0 ? (
        hasActiveSearch ? (
          <DidYouMean query={activeQuery} serverSuggestions={suggestions} onSearch={(q) => router.replace(`/?q=${encodeURIComponent(q)}`)} onBrand={(b) => router.replace(`/?brand=${b.toLowerCase()}`)} />
        ) : (
          <EmptyState icon="📷" title="No photos yet" message="Be the first to share your watch" actionUrl="/upload" actionText="Add a wrist shot" />
        )
      ) : (
        <TileGrid>
          {groups.map((group, groupIdx) => {
            const primary = group.photos[0]
            const { brand, model, ref } = getWatchLabel(group)
            const title = model || ref || unslugify(group.watchId)
            return (
              <article key={group.key} className="group relative min-w-0">
                <Link
                  href={`/photo/${primary.slug ?? primary.id}`}
                  className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-4 focus-visible:ring-offset-canvas rounded-md"
                >
                  <div className="aspect-[4/5] overflow-hidden rounded-md bg-surface">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={primary.thumbnailUrl || primary.url}
                      alt={buildPhotoAltText(primary)}
                      className="block w-full h-full object-cover transition-transform duration-[350ms] ease-out group-hover:scale-[1.035]"
                      loading={groupIdx < 6 ? 'eager' : 'lazy'}
                    />
                  </div>
                  {brand && (
                    <p className="mt-2 sm:mt-3 font-mono text-[10.5px] sm:text-[11px] tracking-[0.8px] sm:tracking-[1px] uppercase text-muted truncate">
                      {brand}
                    </p>
                  )}
                  <p className={`${brand ? 'mt-[3px] sm:mt-1' : 'mt-2 sm:mt-3'} text-[15px] sm:text-[17px] leading-[1.25] font-semibold tracking-[-0.2px] text-ink`}>
                    {title}
                  </p>
                </Link>
                <div className="absolute top-2.5 right-2.5 z-10">
                  <SaveToBoard photoId={primary.id} variant="tile" />
                </div>
              </article>
            )
          })}
        </TileGrid>
      )}

      <div ref={sentinelRef} className="h-1" />
      {loadingMore && (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-muted border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </section>
  )
}

export default function PhotoGallery({ userId }: { userId?: string }) {
  return (
    <Suspense fallback={
      <div className="max-w-[1320px] mx-auto px-4 sm:px-8 pb-16 pt-6">
        <TileGrid>
          {Array.from({ length: 12 }).map((_, i) => <TileSkeleton key={i} />)}
        </TileGrid>
      </div>
    }>
      <PhotoGalleryContent userId={userId} />
    </Suspense>
  )
}
