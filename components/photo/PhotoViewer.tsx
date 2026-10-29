'use client'

import { useCallback, useEffect, useState } from 'react'
import { trackEvent } from '@/lib/gtag'

export interface ViewerPhoto {
  id: string
  url: string
  thumbnailUrl: string | null
  alt: string
}

interface PhotoViewerProps {
  photos: ViewerPhoto[]
  initialIndex: number
  /** Analytics context for the photo_view event */
  track: { watchId: string; brand: string | null; model: string | null }
}

export default function PhotoViewer({ photos, initialIndex, track }: PhotoViewerProps) {
  const [index, setIndex] = useState(initialIndex)
  const [fullSize, setFullSize] = useState(false)
  const active = photos[index] ?? photos[0]
  const total = photos.length

  useEffect(() => {
    trackEvent('photo_view', {
      watch_id: track.watchId,
      brand: track.brand,
      model: track.model,
      photo_id: active.id,
    })
  }, [active.id, track.watchId, track.brand, track.model])

  const step = useCallback(
    (delta: number) => setIndex((i) => (i + delta + total) % total),
    [total]
  )

  // Keyboard: arrows move between shots, Escape closes full size
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return
      if (e.key === 'Escape') setFullSize(false)
      if (total > 1 && e.key === 'ArrowRight') step(1)
      if (total > 1 && e.key === 'ArrowLeft') step(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step, total])

  // Lock page scroll while the full-size view is open
  useEffect(() => {
    if (!fullSize) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [fullSize])

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-[10px] bg-surface">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={active.id}
          src={active.url}
          alt={active.alt}
          className="block w-full aspect-[4/5] lg:aspect-auto lg:h-[720px] object-cover"
          fetchPriority="high"
        />
        {total > 1 && (
          <span className="absolute left-4 top-4 h-8 rounded-full bg-[rgba(14,15,15,0.72)] text-[#EDEBE5] flex items-center px-3 font-mono text-[11px] tracking-[1px] uppercase">
            {index + 1} / {total}
          </span>
        )}
        <button
          type="button"
          onClick={() => setFullSize(true)}
          aria-label="View full size"
          className="absolute right-4 bottom-4 w-11 h-11 rounded-full bg-[rgba(14,15,15,0.72)] text-white flex items-center justify-center hover:bg-[rgba(14,15,15,0.86)] transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
        </button>
      </div>

      {total > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-1 -mb-1">
          {photos.map((photo, i) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Photo ${i + 1}`}
              aria-pressed={i === index}
              className={`shrink-0 w-[72px] h-[72px] sm:w-[88px] sm:h-[88px] p-0 rounded-md overflow-hidden border-2 bg-surface transition-opacity ${
                i === index ? 'border-mark opacity-100' : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.thumbnailUrl || photo.url} alt="" className="block w-full h-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {fullSize && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Full size photo"
          className="fixed inset-0 z-[60] bg-[rgba(14,15,15,0.94)] flex items-center justify-center p-4 sm:p-10"
          onClick={() => setFullSize(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={active.url} alt={active.alt} className="max-w-full max-h-full object-contain" />
          <button
            type="button"
            onClick={() => setFullSize(false)}
            aria-label="Close full size"
            autoFocus
            className="absolute right-4 top-4 w-11 h-11 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
          {total > 1 && (
            <span className="absolute left-4 top-4 h-8 rounded-full bg-white/10 text-[#EDEBE5] flex items-center px-3 font-mono text-[11px] tracking-[1px] uppercase">
              {index + 1} / {total}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
