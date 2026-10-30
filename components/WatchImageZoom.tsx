'use client'

import { useState, useEffect, useCallback } from 'react'

interface Props {
  src: string
  alt: string
  watchName: string
  containerClassName?: string
  imgClassName?: string
}

export default function WatchImageZoom({ src, alt, watchName, containerClassName, imgClassName }: Props) {
  const [open, setOpen] = useState(false)

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, close])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`relative group cursor-zoom-in ${containerClassName ?? ''}`}
        aria-label={`Enlarge image of ${watchName}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className={`transition-transform duration-300 group-hover:scale-105 ${imgClassName ?? ''}`}
          loading="eager"
        />
        {/* Magnifier badge */}
        <span className="absolute bottom-2 right-2 bg-white/80 border border-line rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-sm pointer-events-none">
          <svg className="w-3.5 h-3.5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" strokeWidth="2" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35" />
          </svg>
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm"
          onClick={close}
        >
          <div
            className="flex flex-col items-center gap-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              className="max-w-[80vw] max-h-[80vh] object-contain rounded-sm shadow-lg"
            />
            <p className="text-ink font-semibold text-lg">{watchName}</p>
            <button
              onClick={close}
              className="text-faint hover:text-ink text-sm transition-colors"
            >
              Close ×
            </button>
          </div>
        </div>
      )}
    </>
  )
}
