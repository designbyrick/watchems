'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import DashboardEmpty from '../DashboardEmpty'

interface LikedPhoto {
  likeId: string
  photoId: string
  slug: string | null
  url: string
  thumbnailUrl: string | null
  brandName: string | null
  modelName: string | null
  userName: string
  watchId: string
  likedAt: string
}

export default function LikedClient() {
  const [photos, setPhotos] = useState<LikedPhoto[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLiked = useCallback(async () => {
    try {
      const res = await fetch('/api/user/liked')
      if (res.ok) {
        const data = await res.json()
        setPhotos(data.photos)
      }
    } catch (err) {
      console.error('Failed to fetch liked photos:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchLiked() }, [fetchLiked])

  async function handleUnlike(photoId: string) {
    try {
      await fetch(`/api/photo/${photoId}/like`, { method: 'POST' })
      setPhotos((prev) => prev.filter((p) => p.photoId !== photoId))
    } catch (err) {
      console.error('Failed to unlike:', err)
    }
  }

  return (
    <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-8 pb-16">
      <h1 className="text-[32px] sm:text-[40px] leading-tight font-semibold tracking-[-0.04em] text-ink">Liked</h1>
      <p className="mt-2 text-[15px] text-muted">Wrist shots you liked across the gallery.</p>

      {loading ? (
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-x-3 gap-y-6 sm:gap-x-[18px] sm:gap-y-7">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-[4/5] rounded-md bg-subtle animate-pulse" />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <DashboardEmpty
          title="No liked watches yet"
          message="Tap the heart on any wrist shot in the gallery and it shows up here."
          actionUrl="/"
          actionText="Browse the gallery"
        />
      ) : (
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-x-3 gap-y-6 sm:gap-x-[18px] sm:gap-y-7">
          {photos.map((photo) => {
            const name = [photo.brandName, photo.modelName].filter(Boolean).join(' ') || 'Watch'
            return (
              <article key={photo.likeId} className="group relative min-w-0">
                <Link
                  href={`/photo/${photo.slug ?? photo.photoId}`}
                  className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-4 focus-visible:ring-offset-canvas"
                >
                  <div className="aspect-[4/5] overflow-hidden rounded-md bg-surface">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.thumbnailUrl || photo.url}
                      alt={name}
                      className="block w-full h-full object-cover transition-transform duration-[350ms] ease-out group-hover:scale-[1.035]"
                      loading="lazy"
                    />
                  </div>
                  {photo.brandName && (
                    <p className="mt-2.5 font-mono text-[11px] tracking-[1px] uppercase text-muted truncate">{photo.brandName}</p>
                  )}
                  <p className={`${photo.brandName ? 'mt-[3px]' : 'mt-2.5'} text-base leading-snug font-semibold text-ink`}>
                    {photo.modelName || name}
                  </p>
                  <p className="mt-0.5 text-[13px] text-faint truncate">by {photo.userName}</p>
                </Link>
                <button
                  type="button"
                  onClick={() => handleUnlike(photo.photoId)}
                  className="absolute top-2.5 right-2.5 w-11 h-11 rounded-full bg-surface/95 text-mark hover:bg-surface flex items-center justify-center shadow-sm transition-colors"
                  aria-label={`Unlike ${name}`}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                  </svg>
                </button>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
