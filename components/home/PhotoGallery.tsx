'use client'

import React, { useState, useEffect, useRef, useCallback, Suspense, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { buildPhotoAltText } from '@/lib/photoAlt'
import SocialActions from './SocialActions'
import SaveToBoard from '@/components/SaveToBoard'
import GalleryFilters from './GalleryFilters'
import PhotoCountBadge from '@/components/ui/PhotoCountBadge'
import PhotoCardOverlay from '@/components/ui/PhotoCardOverlay'
import UserAttribution from '@/components/ui/UserAttribution'
import Fuse from 'fuse.js'
import SectionLabel from '@/components/ui/SectionLabel'
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
 * This guards against races between the filter-change effect, IntersectionObserver
 * load-more, and the lightbox prefetch — all of which append to the same state.
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

// Group related photos by watchId+userId (same user's upload = one entry)
interface RelatedGroup {
  key: string
  cover: PhotoItem
  photos: PhotoItem[]
  label: string
}

function groupByWatchUser(items: PhotoItem[]): RelatedGroup[] {
  const map = new Map<string, PhotoItem[]>()
  for (const p of items) {
    const key = `${p.watchId}::${p.userId}`
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(p)
  }
  return Array.from(map.entries()).map(([key, photos]) => {
    // Pick best cover: lowest sortOrder first, then oldest (first uploaded)
    const cover = [...photos].sort((a, b) => {
      const orderDiff = (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
      if (orderDiff !== 0) return orderDiff
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })[0]
    return {
      key,
      cover,
      photos,
      label: [photos[0].brandName || photos[0].watchBrand, photos[0].modelName || photos[0].watchName].filter(Boolean).join(' '),
    }
  })
}

function RelatedPhotoCard({ group, onClick, variant }: {
  group: RelatedGroup
  onClick: (cover: PhotoItem) => void
  variant: 'grid' | 'masonry'
}) {
  if (variant === 'masonry') {
    return (
      <button
        key={group.key}
        type="button"
        onClick={(e) => { e.stopPropagation(); onClick(group.cover) }}
        className="block w-full mb-2.5 break-inside-avoid"
      >
        <div className="relative rounded-xl overflow-hidden bg-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={group.cover.url}
            alt={buildPhotoAltText(group.cover)}
            className="w-full h-auto object-cover"
            loading="lazy"
          />
          <PhotoCountBadge count={group.photos.length} />
        </div>
        {group.label && (
          <p className="text-gray-700 text-xs font-medium mt-1.5 text-left truncate">{group.label}</p>
        )}
      </button>
    )
  }

  return (
    <button
      key={group.key}
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(group.cover) }}
      className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100 hover:bg-gray-200 transition-colors"
      aria-label={group.label || 'Related photo'}
    >
      <Image src={group.cover.thumbnailUrl || group.cover.url} alt={buildPhotoAltText(group.cover)} fill className="object-cover transition-transform duration-200 group-hover:scale-105" sizes="20vw" />
      <PhotoCountBadge count={group.photos.length} />
      <PhotoCardOverlay label={group.label} />
    </button>
  )
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

function PhotoGalleryContent({ initialPhotoSlug, userId }: { initialPhotoSlug?: string; userId?: string }) {
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

  // Lightbox state
  const [lightbox, setLightbox] = useState<{ groupIdx: number; photoIdx: number } | null>(null)
  const [lightboxImageLoading, setLightboxImageLoading] = useState(false)
  // Warm the shared watches cache — DidYouMean reads it for fuzzy suggestions
  useEffect(() => {
    if (!getWatchesCacheSync()) getWatchesData().catch(() => {})
  }, [])

  // Zoom / pan state
  const [zoom, setZoom] = useState(1)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)

  // Touch refs
  const touchStartXRef = useRef<number | null>(null)
  const touchStartYRef = useRef<number | null>(null)
  const lastTouchDistRef = useRef<number | null>(null)
  const isPinchingRef = useRef(false)
  const isDraggingRef = useRef(false)
  const dragStartXRef = useRef(0)
  const dragStartYRef = useRef(0)
  const dragStartPanXRef = useRef(0)
  const dragStartPanYRef = useRef(0)
  const lastTapTimeRef = useRef(0)

  // Related photos
  const [relatedPhotos, setRelatedPhotos] = useState<PhotoItem[]>([])
  const [relatedPhotosLoading, setRelatedPhotosLoading] = useState(false)
  const [relatedNextCursor, setRelatedNextCursor] = useState<string | null>(null)
  const [relatedLoadingMore, setRelatedLoadingMore] = useState(false)
  const relatedPhotosCacheRef = useRef<
    Map<string, { photos: PhotoItem[]; cursor: string | null }>
  >(new Map())
  const relatedSentinelRef = useRef<HTMLDivElement | null>(null)
  const activeLightboxPhotoRef = useRef<PhotoItem | null>(null)

  // Override: a related photo not yet in `groups`
  const [photoOverride, setPhotoOverride] = useState<PhotoItem | null>(null)
  const [showMobileSpecs, setShowMobileSpecs] = useState(false)

  // Abort controller for cancelling stale fetches
  const abortRef = useRef<AbortController | null>(null)

  // Pinterest-style URL tracking
  const galleryUrlRef = useRef<string>('/')
  const lightboxOpenRef = useRef(false)
  const initialPhotoOpenedRef = useRef(false)
  const groupsRef = useRef<ReturnType<typeof groupByWatch>>([])

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

  const fetchRelatedPhotos = useCallback(async (currentPhoto: PhotoItem) => {
    const watchId = currentPhoto.watchId
    const cached = relatedPhotosCacheRef.current.get(watchId)
    if (cached) {
      setRelatedPhotos(cached.photos)
      setRelatedNextCursor(cached.cursor)
      return
    }
    setRelatedPhotosLoading(true)
    setRelatedNextCursor(null)
    try {
      const model = currentPhoto.modelName || currentPhoto.watchName || null
      const brand = currentPhoto.watchBrand || currentPhoto.brandName || null

      // Single batched request instead of 3-4 sequential calls
      const params = new URLSearchParams({ watchId, excludeId: currentPhoto.id })
      if (model) params.set('model', model)
      if (brand) params.set('brand', brand)
      const res = await fetch(`/api/photos/related?${params.toString()}`)
      const data: {
        sameWatch: PhotoItem[]
        related: PhotoItem[]
        nextCursor: string | null
      } = await res.json()

      // Inject same-watch photos not yet in the main feed so groupByWatch merges them into the carousel.
      // Only inject photos from the same user — cross-user photos with the same watchId are a data anomaly
      // (two users' submissions incorrectly merged) and must NOT be merged into the same carousel group.
      setPhotos((prev) => {
        const existingIds = new Set(prev.map((p) => p.id))
        const missing = data.sameWatch.filter(
          (p) => !existingIds.has(p.id) && p.userId === currentPhoto.userId
        )
        return missing.length > 0 ? [...prev, ...missing] : prev
      })

      const relatedList = [...data.sameWatch, ...data.related]
      const nextCursor = data.nextCursor ?? null
      relatedPhotosCacheRef.current.set(watchId, { photos: relatedList, cursor: nextCursor })
      setRelatedPhotos(relatedList)
      setRelatedNextCursor(nextCursor)
    } catch (error) {
      console.error('Failed to fetch related photos:', error)
      setRelatedPhotos([])
      setRelatedNextCursor(null)
    } finally {
      setRelatedPhotosLoading(false)
    }
  }, [])

  const fetchMoreRelatedPhotos = useCallback(async () => {
    const currentPhoto = activeLightboxPhotoRef.current
    if (!currentPhoto) return
    if (!relatedNextCursor) return
    if (relatedLoadingMore) return

    const watchId = currentPhoto.watchId
    setRelatedLoadingMore(true)
    try {
      const params = new URLSearchParams({
        watchId,
        excludeId: currentPhoto.id,
        loadMore: '1',
        cursor: relatedNextCursor,
      })
      const res = await fetch(`/api/photos/related?${params.toString()}`)
      const data: {
        sameWatch: PhotoItem[]
        related: PhotoItem[]
        nextCursor: string | null
      } = await res.json()

      const newPhotos = data.related ?? []
      const newCursor = data.nextCursor ?? null

      setRelatedPhotos((prev) => {
        const seen = new Set(prev.map((p) => p.id))
        const additions = newPhotos.filter((p) => !seen.has(p.id))
        const merged = additions.length > 0 ? [...prev, ...additions] : prev
        // Update cache so reopening this watch later preserves the loaded pages.
        relatedPhotosCacheRef.current.set(watchId, { photos: merged, cursor: newCursor })
        return merged
      })
      setRelatedNextCursor(newCursor)
    } catch (error) {
      console.error('Failed to fetch more related photos:', error)
    } finally {
      setRelatedLoadingMore(false)
    }
  }, [relatedNextCursor, relatedLoadingMore])

  const groups = useMemo(() => {
    const g = groupByWatch(photos)
    groupsRef.current = g
    return g
  }, [photos])

  // Flat list of ALL photos across all groups (gallery-wide navigation)
  const flatPhotos = useMemo(() => groups.flatMap((g) => g.photos), [groups])

  // Auto-open lightbox when initialPhotoSlug is provided
  useEffect(() => {
    if (!initialPhotoSlug || initialPhotoOpenedRef.current || loading || groups.length === 0) return

    for (let gi = 0; gi < groups.length; gi++) {
      const pi = groups[gi].photos.findIndex(
        (p) => (p.slug ?? p.id) === initialPhotoSlug
      )
      if (pi !== -1) {
        initialPhotoOpenedRef.current = true
        galleryUrlRef.current = '/'
        lightboxOpenRef.current = true
        window.history.replaceState({ lightbox: true }, '', window.location.pathname)
        setLightbox({ groupIdx: gi, photoIdx: pi })
        return
      }
    }

    if (nextCursor && !loadingMore) {
      setLoadingMore(true)
      fetchPhotos(nextCursor).then((data) => {
        setPhotos((prev) => mergePhotosDedupe(prev, data.photos))
        setNextCursor(data.nextCursor)
        setLoadingMore(false)
      }).catch(() => setLoadingMore(false))
    } else if (!nextCursor) {
      initialPhotoOpenedRef.current = true
    }
  }, [initialPhotoSlug, groups, loading, nextCursor, loadingMore, fetchPhotos])

  useEffect(() => {
    // When the lightbox is open it manipulates the URL via pushState, which causes
    // Next.js App Router to update searchParams and change activeQuery/activeWatchId.
    // Ignore those URL-driven re-runs while the lightbox is open — the user is just
    // viewing a photo, not actually changing the search filter.
    if (lightboxOpenRef.current) return

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
      setLightbox(null)

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

  // Fetch more photos when navigating near the end of loaded groups
  useEffect(() => {
    if (!lightbox || !nextCursor || loadingMore) return
    if (lightbox.groupIdx >= groups.length - 5) {
      setLoadingMore(true)
      fetchPhotos(nextCursor).then((data) => {
        setPhotos((prev) => mergePhotosDedupe(prev, data.photos))
        setNextCursor(data.nextCursor)
        setLoadingMore(false)
      }).catch(() => setLoadingMore(false))
    }
  }, [lightbox, groups.length, nextCursor, loadingMore, fetchPhotos])

  // Show loading state when lightbox photo changes
  useEffect(() => {
    if (lightbox === null) return
    setLightboxImageLoading(true)
    setShowMobileSpecs(false)
  }, [lightbox])

  // Lock body scroll when lightbox is open
  const savedScrollYRef = useRef(0)
  useEffect(() => {
    if (lightbox !== null) {
      savedScrollYRef.current = window.scrollY
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.top = `-${savedScrollYRef.current}px`
      document.body.style.width = '100%'
    } else {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      window.scrollTo(0, savedScrollYRef.current)
    }
    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
    }
  }, [lightbox])

  // Reset zoom/pan when photo changes
  useEffect(() => {
    setZoom(1)
    setPanX(0)
    setPanY(0)
  }, [lightbox?.groupIdx, lightbox?.photoIdx, photoOverride?.id])

  const openLightbox = useCallback((groupIdx: number, photoIdx: number = 0) => {
    // Read from ref so this callback is never stale — avoids the race where groups
    // empties during a search filter change and onClick fires before re-population
    const photo = groupsRef.current[groupIdx]?.photos[photoIdx]
    if (photo) {
      galleryUrlRef.current = window.location.pathname + window.location.search
      lightboxOpenRef.current = true
      window.history.pushState({ lightbox: true }, '', `/photo/${photo.slug ?? photo.id}`)
      setPhotoOverride(null)
      setLightboxImageLoading(true)
      setLightbox({ groupIdx, photoIdx })

      trackEvent('photo_view', {
        watch_id: photo.watchId,
        brand: photo.brandName ?? photo.watchBrand ?? null,
        model: photo.modelName ?? photo.watchName ?? null,
        photo_id: photo.id,
      })
    }
  }, [])

  // Auto-open first photo when coming from a dropdown selection (?open=1)
  useEffect(() => {
    if (!autoOpen || loading || groups.length === 0) return
    // Strip open=1 from URL so back-navigation doesn't re-trigger
    const params = new URLSearchParams(window.location.search)
    params.delete('open')
    const qs = params.toString()
    window.history.replaceState({}, '', qs ? `/?${qs}` : '/')
    openLightbox(0, 0)
  }, [autoOpen, loading, groups.length, openLightbox])

  const navigateLightbox = useCallback((groupIdx: number, photoIdx: number = 0) => {
    const photo = groups[groupIdx]?.photos[photoIdx]
    if (photo) {
      window.history.replaceState({ lightbox: true }, '', `/photo/${photo.slug ?? photo.id}`)
    }
    setPhotoOverride(null)
    setLightboxImageLoading(true)
    setLightbox({ groupIdx, photoIdx })
  }, [groups])

  // Navigate by flat index (through ALL gallery photos)
  const navigateToFlat = useCallback((idx: number) => {
    if (idx < 0 || idx >= flatPhotos.length) return
    let sum = 0
    for (let gi = 0; gi < groups.length; gi++) {
      if (idx < sum + groups[gi].photos.length) {
        navigateLightbox(gi, idx - sum)
        return
      }
      sum += groups[gi].photos.length
    }
  }, [flatPhotos.length, groups, navigateLightbox])

  const openRelatedPhoto = useCallback((photo: PhotoItem) => {
    for (let gi = 0; gi < groups.length; gi++) {
      const pi = groups[gi].photos.findIndex((p) => p.id === photo.id)
      if (pi !== -1) {
        navigateLightbox(gi, pi)
        return
      }
    }
    setPhotoOverride(photo)
    window.history.replaceState({ lightbox: true }, '', `/photo/${photo.slug ?? photo.id}`)
    setLightboxImageLoading(true)
  }, [groups, navigateLightbox])

  const closeLightbox = useCallback(() => {
    lightboxOpenRef.current = false
    setLightbox(null)
    setPhotoOverride(null)
    window.history.pushState({}, '', galleryUrlRef.current)
  }, [])

  // Current flat index of the active photo
  const currentFlatIdx = useMemo(() => {
    if (lightbox === null) return -1
    if (photoOverride) return flatPhotos.findIndex((p) => p.id === photoOverride.id)
    let sum = 0
    for (let gi = 0; gi < lightbox.groupIdx; gi++) {
      sum += groups[gi].photos.length
    }
    return sum + lightbox.photoIdx
  }, [lightbox, photoOverride, flatPhotos, groups])

  // Keyboard navigation — arrows navigate all photos (flat)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!lightbox) return
      if (e.key === 'Escape') {
        closeLightbox()
      } else if (e.key === 'ArrowLeft') {
        navigateToFlat(currentFlatIdx - 1)
      } else if (e.key === 'ArrowRight') {
        navigateToFlat(currentFlatIdx + 1)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lightbox, currentFlatIdx, closeLightbox, navigateToFlat])

  // Preload adjacent photos in flat list
  useEffect(() => {
    if (!lightbox) return
    const urlsToPreload: string[] = []
    if (currentFlatIdx < flatPhotos.length - 1) {
      const next = flatPhotos[currentFlatIdx + 1]
      if (next) urlsToPreload.push(next.url)
    }
    if (currentFlatIdx > 0) {
      const prev = flatPhotos[currentFlatIdx - 1]
      if (prev) urlsToPreload.push(prev.url)
    }
    // Preload via Next.js image optimizer URLs so the browser cache is reused
    // by the <Image> component (which serves through /_next/image, not raw URLs).
    // 1200w covers 60vw on up to ~2000px-wide screens; 828w covers mobile 100vw.
    urlsToPreload.forEach((url) => {
      const encoded = encodeURIComponent(url)
      ;[1200, 828].forEach((w) => {
        const link = document.createElement('link')
        link.rel = 'prefetch'
        link.as = 'image'
        link.href = `/_next/image?url=${encoded}&w=${w}&q=75`
        document.head.appendChild(link)
      })
    })
  }, [lightbox, currentFlatIdx, flatPhotos])

  // Handle browser back button
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (lightboxOpenRef.current) {
        lightboxOpenRef.current = false
        setLightbox(null)
        setPhotoOverride(null)
        e.preventDefault?.()
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const activeLightboxGroup = lightbox !== null ? groups[lightbox.groupIdx] : null
  const activeLightboxPhotos = useMemo(
    () => activeLightboxGroup?.photos ?? [],
    [activeLightboxGroup]
  )
  const activeLightboxPhoto = photoOverride ?? (activeLightboxPhotos[lightbox?.photoIdx ?? 0] ?? null)

  // Fetch related photos when lightbox photo changes
  useEffect(() => {
    activeLightboxPhotoRef.current = activeLightboxPhoto
    if (!activeLightboxPhoto) return
    fetchRelatedPhotos(activeLightboxPhoto)
  }, [activeLightboxPhoto, fetchRelatedPhotos])

  // Infinite scroll: load more fallback photos when sentinel enters viewport
  useEffect(() => {
    const node = relatedSentinelRef.current
    if (!node) return
    if (!relatedNextCursor) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          fetchMoreRelatedPhotos()
        }
      },
      { rootMargin: '600px' }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [relatedNextCursor, fetchMoreRelatedPhotos])

  const otherWatchRelated = relatedPhotos.filter(
    (p) => !(p.watchId === activeLightboxPhoto?.watchId && p.userId === activeLightboxPhoto?.userId)
  )
  const currentModelName = activeLightboxPhoto?.modelName || activeLightboxPhoto?.watchName || null

  const sameModelRelated = currentModelName
    ? otherWatchRelated.filter((p) => (p.modelName || p.watchName) === currentModelName)
    : []
  const otherModelRelated = currentModelName
    ? otherWatchRelated.filter((p) => (p.modelName || p.watchName) !== currentModelName)
    : otherWatchRelated
  const sameModelGroups = groupByWatchUser(sameModelRelated)
  const otherModelGroups = groupByWatchUser(otherModelRelated)

  // Scroll-wheel zoom
  const photoAreaRef = useRef<HTMLDivElement>(null)
  const zoomRef = useRef(zoom)
  useEffect(() => { zoomRef.current = zoom }, [zoom])

  useEffect(() => {
    const el = photoAreaRef.current
    if (!el) return
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY < 0 ? 1.1 : 0.9
      setZoom((z) => {
        const next = Math.max(1, Math.min(4, z * delta))
        if (next <= 1) { setPanX(0); setPanY(0) }
        return next
      })
    }
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [lightbox])

  // Touch: swipe (horizontal) + pinch-to-zoom + double-tap + pan-when-zoomed
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      isPinchingRef.current = true
      touchStartXRef.current = null
      touchStartYRef.current = null
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      lastTouchDistRef.current = Math.sqrt(dx * dx + dy * dy)
      return
    }

    if (e.touches.length === 1) {
      const x = e.touches[0].clientX
      const y = e.touches[0].clientY
      touchStartXRef.current = x
      touchStartYRef.current = y

      // Double-tap: toggle zoom
      const now = Date.now()
      if (now - lastTapTimeRef.current < 300) {
        lastTapTimeRef.current = 0
        setZoom((z) => {
          if (z > 1) { setPanX(0); setPanY(0); return 1 }
          return 2.5
        })
        return
      }
      lastTapTimeRef.current = now

      // Pan when zoomed
      if (zoomRef.current > 1) {
        isDraggingRef.current = true
        dragStartXRef.current = x
        dragStartYRef.current = y
        dragStartPanXRef.current = panX
        dragStartPanYRef.current = panY
      }
    }
  }, [panX, panY])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isPinchingRef.current && e.touches.length === 2) {
      e.preventDefault()
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (lastTouchDistRef.current) {
        const ratio = dist / lastTouchDistRef.current
        setZoom((z) => Math.max(1, Math.min(4, z * ratio)))
      }
      lastTouchDistRef.current = dist
      return
    }

    if (isDraggingRef.current && zoomRef.current > 1 && e.touches.length === 1) {
      e.preventDefault()
      const dx = e.touches[0].clientX - dragStartXRef.current
      const dy = e.touches[0].clientY - dragStartYRef.current
      setPanX(dragStartPanXRef.current + dx)
      setPanY(dragStartPanYRef.current + dy)
    }
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (isPinchingRef.current) {
      isPinchingRef.current = false
      lastTouchDistRef.current = null
      setZoom((z) => {
        if (z < 1.05) { setPanX(0); setPanY(0); return 1 }
        return z
      })
      isDraggingRef.current = false
      return
    }

    if (isDraggingRef.current) {
      isDraggingRef.current = false
      return
    }

    // Horizontal swipe — only when not zoomed
    if (zoomRef.current <= 1 && touchStartXRef.current !== null && touchStartYRef.current !== null) {
      const endX = e.changedTouches[0].clientX
      const endY = e.changedTouches[0].clientY
      const dx = touchStartXRef.current - endX
      const dy = touchStartYRef.current - endY

      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
        if (dx > 0) {
          navigateToFlat(currentFlatIdx + 1)
        } else {
          navigateToFlat(currentFlatIdx - 1)
        }
      }
    }

    touchStartXRef.current = null
    touchStartYRef.current = null
  }, [currentFlatIdx, navigateToFlat])

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
                <a
                  href={`/photo/${primary.slug ?? primary.id}`}
                  onClick={(e) => {
                    // Let modified clicks open the photo page in a new tab
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
                    e.preventDefault()
                    openLightbox(groupIdx, 0)
                  }}
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
                </a>
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

      {/* ─── Full-screen light lightbox ─── */}
      {lightbox !== null && activeLightboxPhoto && (
        <div
          className="fixed inset-0 z-50 bg-white/95 backdrop-blur-sm flex overflow-hidden"
          style={{ overscrollBehavior: 'contain' }}
          onClick={closeLightbox}
        >
          {/* Close button — fixed top-left */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); closeLightbox() }}
            className="fixed top-3 left-3 z-[60] text-gray-600 hover:text-gray-900 bg-white/80 hover:bg-gray-100 backdrop-blur-sm rounded-full w-9 h-9 flex items-center justify-center transition-all border border-gray-200"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>

          {/* Main content */}
          <div
            className="flex flex-1 flex-col md:flex-row min-h-0 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-y-auto md:overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Left / main column ── */}
            <div className={`flex flex-col min-h-0 min-w-0 w-full ${otherWatchRelated.length > 0 ? 'md:w-1/2' : ''} md:overflow-hidden`}>

              {/* Photo area — sticky on mobile so it stays visible while scrolling */}
              <div
                ref={photoAreaRef}
                className="relative min-h-[55vh] md:min-h-0 md:flex-1 flex items-center justify-center overflow-hidden p-4 pt-4 md:p-6"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{ cursor: zoom > 1 ? 'grab' : 'default', touchAction: 'none' }}
              >
                {/* Save / Like / Share — top-right of photo area */}
                <div className="absolute top-2 right-2 z-30 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <SaveToBoard key={`save-${activeLightboxPhoto.id}`} photoId={activeLightboxPhoto.id} variant="button" />
                  <SocialActions
                    key={`social-${activeLightboxPhoto.id}`}
                    photoId={activeLightboxPhoto.id}
                    photoSlug={activeLightboxPhoto.slug ?? activeLightboxPhoto.id}
                    variant="lightbox"
                  />
                </div>

                {/* Loading spinner */}
                {lightboxImageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                    <div className="w-10 h-10 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
                  </div>
                )}

                {/* Zoom level indicator */}
                {zoom > 1 && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 text-gray-700 text-xs px-2.5 py-1 rounded-full z-10 pointer-events-none shadow-sm border border-gray-200">
                    {Math.round(zoom * 10) / 10}×
                  </div>
                )}

                {/* Photo with zoom/pan transform */}
                <div
                  className="relative w-full h-full"
                  style={{
                    transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
                    transformOrigin: 'center center',
                    willChange: 'transform',
                  }}
                >
                  <Image
                    src={activeLightboxPhoto.url}
                    alt={buildPhotoAltText(activeLightboxPhoto)}
                    fill
                    sizes="(max-width: 768px) 100vw, 60vw"
                    className="object-contain"
                    priority
                    onLoad={() => setLightboxImageLoading(false)}
                    draggable={false}
                  />
                </div>

                {/* Gallery left arrow — navigates ALL photos */}
                {currentFlatIdx > 0 && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); navigateToFlat(currentFlatIdx - 1) }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-700 bg-white/90 hover:bg-white shadow-sm rounded-full w-12 h-12 flex items-center justify-center transition-all z-20 border border-gray-200 text-2xl leading-none"
                    aria-label="Previous photo"
                  >
                    ‹
                  </button>
                )}

                {/* Gallery right arrow — navigates ALL photos */}
                {currentFlatIdx < flatPhotos.length - 1 && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); navigateToFlat(currentFlatIdx + 1) }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-700 bg-white/90 hover:bg-white shadow-sm rounded-full w-12 h-12 flex items-center justify-center transition-all z-20 border border-gray-200 text-2xl leading-none"
                    aria-label="Next photo"
                  >
                    ›
                  </button>
                )}

                {/* Dot indicators for multiple photos of the same watch */}
                {activeLightboxPhotos.length > 1 && (
                  <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10 pointer-events-none">
                    {activeLightboxPhotos.map((_, i) => (
                      <div
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full transition-all ${
                          i === (lightbox?.photoIdx ?? 0) ? 'bg-gray-700 scale-125' : 'bg-gray-400'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* ── Info bar ── */}
              {(() => {
                const p = activeLightboxPhoto
                const brand = p.brandName || p.watchBrand || null
                const model = p.modelName || p.watchName || null
                const ref = p.referenceNumber || p.watchReference || null
                const specs: { label: string; value: string }[] = []
                if (ref) specs.push({ label: 'Reference', value: ref })
                if (p.movement) specs.push({ label: 'Movement', value: p.movement })
                if (p.caseSize) specs.push({ label: 'Case', value: p.caseSize })
                if (p.waterResistance) specs.push({ label: 'Water Resistance', value: p.waterResistance })
                if (p.lugToLug) specs.push({ label: 'Lug to Lug', value: p.lugToLug })
                if (p.betweenLugs) specs.push({ label: 'Lug Width', value: p.betweenLugs })
                if (p.thickness) specs.push({ label: 'Thickness', value: p.thickness })
                if (p.wristSize) specs.push({ label: 'Wrist Size', value: p.wristSize })
                if (p.estimatedPrice) specs.push({ label: 'Price', value: p.estimatedPrice })

                return (
                  <div className="flex-shrink-0 md:flex-shrink-0 px-4 py-3 max-h-[45vh] md:max-h-none overflow-y-auto">
                    <div>
                      <div className="min-w-0">
                        {(brand || model) && (
                          <p className="text-gray-900 font-semibold text-sm truncate">
                            {brand ? (
                              <span>{brand}</span>
                            ) : null}
                            {brand && model ? ' ' : null}
                            {model ?? null}
                          </p>
                        )}
                        <UserAttribution userName={p.userName} userId={p.userId} isOfficial={p.isOfficial} className="text-gray-400 text-xs mt-0.5" onClick={(e) => e.stopPropagation()} />
                        {specs.length > 0 && (
                          <>
                            {/* Mobile: collapsible specs */}
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setShowMobileSpecs(!showMobileSpecs) }}
                              className="md:hidden mt-1.5 flex items-center gap-1 text-gray-400 text-[10px] uppercase tracking-wide font-semibold"
                            >
                              Specs
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className={`w-3 h-3 transition-transform ${showMobileSpecs ? 'rotate-180' : ''}`}
                                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            {showMobileSpecs && (
                              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 md:hidden">
                                {specs.map((s) => (
                                  <div key={s.label} className="flex items-baseline gap-1">
                                    <span className="text-gray-400 text-[10px] uppercase tracking-wide">{s.label}</span>
                                    <span className="text-gray-700 text-xs font-medium">{s.value}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {/* Desktop: always visible */}
                            <div className="hidden md:flex mt-1.5 flex-wrap gap-x-4 gap-y-1">
                              {specs.map((s) => (
                                <div key={s.label} className="flex items-baseline gap-1">
                                  <span className="text-gray-400 text-[10px] uppercase tracking-wide">{s.label}</span>
                                  <span className="text-gray-700 text-xs font-medium">{s.value}</span>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Mobile: same-watch thumbnail strip */}
                    {activeLightboxPhotos.length > 1 && (
                      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 md:hidden">
                        {activeLightboxPhotos.map((thumb, thumbIdx) => (
                          <button
                            key={thumb.id}
                            type="button"
                            onClick={(e) => { e.stopPropagation(); navigateLightbox(lightbox.groupIdx, thumbIdx) }}
                            className={`shrink-0 relative rounded-lg overflow-hidden w-14 h-14 border-2 transition-colors ${
                              thumbIdx === (lightbox?.photoIdx ?? 0)
                                ? 'border-amber-400'
                                : 'border-transparent opacity-50 hover:opacity-80'
                            }`}
                            aria-label={`Photo ${thumbIdx + 1}`}
                          >
                            <Image src={thumb.thumbnailUrl || thumb.url} alt={buildPhotoAltText(thumb)} fill className="object-cover" sizes="56px" />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Mobile: Pinterest-style related photos grid (grouped by watch+user) */}
                    {otherWatchRelated.length > 0 && (
                      <div className="mt-4 md:hidden">
                        <div className="flex items-center justify-between mb-3">
                          <SectionLabel>More like this</SectionLabel>
                        </div>
                        <div className="columns-2 gap-2.5">
                          {groupByWatchUser(otherWatchRelated).map((g) => (
                            <RelatedPhotoCard key={g.key} group={g} onClick={openRelatedPhoto} variant="masonry" />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>

            {/* ── Right panel: related photos (desktop only) ── */}
            {otherWatchRelated.length > 0 && (
              <div className="hidden md:flex flex-col w-1/2 overflow-hidden">
                <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
                  {relatedPhotosLoading ? (
                    <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="aspect-square rounded-xl bg-gray-200 animate-pulse" />
                      ))}
                    </div>
                  ) : (
                    <>
                      {sameModelGroups.length > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <SectionLabel>
                              More {currentModelName ?? 'like this'}
                            </SectionLabel>
                            {false && (
                              <a
                                href="#"
                                className="text-xs text-gray-400 hover:text-gray-700 underline underline-offset-2 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                See all →
                              </a>
                            )}
                          </div>
                          <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-1.5">
                            {sameModelGroups.map((g) => (
                              <RelatedPhotoCard key={g.key} group={g} onClick={openRelatedPhoto} variant="grid" />
                            ))}
                          </div>
                        </div>
                      )}
                      {otherModelGroups.length > 0 && (
                        <div>
                          {sameModelGroups.length > 0 && (
                            <SectionLabel className="mb-2">Other watches</SectionLabel>
                          )}
                          <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-1.5">
                            {otherModelGroups.map((g) => (
                              <RelatedPhotoCard key={g.key} group={g} onClick={openRelatedPhoto} variant="grid" />
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Infinite-scroll sentinel + loading indicator */}
                      {relatedNextCursor && (
                        <div ref={relatedSentinelRef} className="py-3 flex justify-center">
                          {relatedLoadingMore ? (
                            <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-1.5 w-full">
                              {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="aspect-square rounded-xl bg-gray-200 animate-pulse" />
                              ))}
                            </div>
                          ) : (
                            <div className="h-1" />
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

export default function PhotoGallery({ initialPhotoSlug, userId }: { initialPhotoSlug?: string; userId?: string }) {
  return (
    <Suspense fallback={
      <div className="max-w-[1320px] mx-auto px-4 sm:px-8 pb-16 pt-6">
        <TileGrid>
          {Array.from({ length: 12 }).map((_, i) => <TileSkeleton key={i} />)}
        </TileGrid>
      </div>
    }>
      <PhotoGalleryContent initialPhotoSlug={initialPhotoSlug} userId={userId} />
    </Suspense>
  )
}
