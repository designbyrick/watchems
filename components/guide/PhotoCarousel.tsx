'use client'

import { useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { c, t } from '@/lib/styles'

interface Photo {
  id: string
  slug: string | null
  url: string
  thumbnailUrl: string | null
  brandName: string | null
  modelName: string | null
}

interface Props {
  modelName: string
  photos: Photo[]
}

export function PhotoCarousel({ modelName, photos }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  function scroll(dir: 'left' | 'right') {
    if (!ref.current) return
    const amount = ref.current.clientWidth
    ref.current.scrollBy({ left: dir === 'right' ? amount : -amount, behavior: 'smooth' })
  }

  return (
    <div>
      {modelName && <p className={`${t.meta} font-medium mb-2`}>{modelName}</p>}

      <div className="relative">
        {photos.length > 4 && (
          <>
            <button
              onClick={() => scroll('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-surface border border-line hover:border-line-strong shadow-sm transition-colors text-muted"
              aria-label="Scroll left"
            >
              ‹
            </button>
            <button
              onClick={() => scroll('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-surface border border-line hover:border-line-strong shadow-sm transition-colors text-muted"
              aria-label="Scroll right"
            >
              ›
            </button>
          </>
        )}

        <div
          ref={ref}
          className="flex gap-2 overflow-x-auto scrollbar-hide scroll-smooth"
        >
          {photos.map((photo) => (
            <Link
              key={photo.id}
              href={`/photo/${photo.slug ?? photo.id}`}
              className={`group shrink-0 w-[calc(25%-6px)] rounded-xl overflow-hidden ${c.card} hover:border-line-strong hover:shadow-sm transition-all`}
            >
              <div className="aspect-square bg-canvas overflow-hidden relative">
                <Image
                  src={photo.thumbnailUrl ?? photo.url}
                  alt={[photo.brandName, photo.modelName].filter(Boolean).join(' ') || modelName}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="25vw"
                />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
