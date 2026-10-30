'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Heart } from 'lucide-react'
import { useIsSignedIn } from '@/lib/useIsSignedIn'
import ShareDropdown from './ShareDropdown'

interface SocialActionsProps {
  photoId: string
  /** SEO slug for share URLs (falls back to photoId if not provided) */
  photoSlug?: string
  /** 'card' = small overlay on gallery card hover, 'detail' = 52px round buttons on the photo page */
  variant: 'card' | 'detail'
}

export default function SocialActions({ photoId, photoSlug, variant }: SocialActionsProps) {
  const isSignedIn = useIsSignedIn()
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [animating, setAnimating] = useState(false)
  const fetchedRef = useRef(false)

  // Fetch initial like state
  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    fetch(`/api/photo/${photoId}/like`)
      .then((r) => r.json())
      .then((data) => {
        setLiked(data.liked)
        setLikeCount(data.count)
      })
      .catch(() => {})

  }, [photoId])

  const handleLike = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()

      if (!isSignedIn) {
        window.location.href = '/sign-in'
        return
      }

      // Optimistic update
      const wasLiked = liked
      setLiked(!wasLiked)
      setLikeCount((c) => c + (wasLiked ? -1 : 1))
      setAnimating(true)
      setTimeout(() => setAnimating(false), 300)

      try {
        const res = await fetch(`/api/photo/${photoId}/like`, { method: 'POST' })
        if (res.ok) {
          const data = await res.json()
          setLiked(data.liked)
          setLikeCount(data.count)
        } else {
          // Revert
          setLiked(wasLiked)
          setLikeCount((c) => c + (wasLiked ? 1 : -1))
        }
      } catch {
        setLiked(wasLiked)
        setLikeCount((c) => c + (wasLiked ? 1 : -1))
      }
    },
    [liked, photoId, isSignedIn]
  )

  const iconSize = variant === 'card' ? 14 : 20

  if (variant === 'detail') {
    return (
      <div className="flex items-center gap-2.5" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={handleLike}
          className={`w-[52px] h-[52px] rounded-full border border-line flex items-center justify-center transition-all hover:border-line-strong ${
            liked ? 'text-mark' : 'text-ink'
          } ${animating ? 'scale-110' : 'scale-100'}`}
          aria-label={`${liked ? 'Unlike' : 'Like'}${likeCount > 0 ? ` (${likeCount} like${likeCount !== 1 ? 's' : ''})` : ''}`}
          aria-pressed={liked}
          title={likeCount > 0 ? `${likeCount} like${likeCount !== 1 ? 's' : ''}` : undefined}
        >
          <Heart size={iconSize} strokeWidth={2} fill={liked ? 'currentColor' : 'none'} />
        </button>
        <ShareDropdown
          photoSlug={photoSlug ?? photoId}
          iconSize={iconSize}
          className="[&>button]:w-[52px] [&>button]:h-[52px] [&>button]:bg-transparent [&>button]:hover:bg-transparent [&>button]:backdrop-blur-none [&>button]:border [&>button]:border-line [&>button]:hover:border-line-strong [&>button]:text-ink"
        />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      {/* Like */}
      <button
        type="button"
        onClick={handleLike}
        className={`rounded-full flex items-center justify-center transition-all w-8 h-8 backdrop-blur-sm bg-black/50 hover:bg-black/70 ${
          liked ? 'text-red-500' : 'text-white'
        } ${animating ? 'scale-125' : 'scale-100'}`}
        aria-label={liked ? 'Unlike' : 'Like'}
      >
        <Heart size={iconSize} fill={liked ? 'currentColor' : 'none'} />
      </button>
      {likeCount > 0 && (
        <span className="text-xs font-medium text-white drop-shadow-sm -ml-0.5 mr-0.5">
          {likeCount}
        </span>
      )}

      {/* Share */}
      <ShareDropdown
        photoSlug={photoSlug ?? photoId}
        iconSize={iconSize}
        className="[&>button]:w-8 [&>button]:h-8"
      />

    </div>
  )
}
