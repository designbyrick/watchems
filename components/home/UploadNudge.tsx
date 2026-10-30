'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Camera, X } from 'lucide-react'

const SESSION_KEY = 'watchems_upload_nudge_seen'
const DELAY_MS = 3000

interface NudgePhoto {
  id: string
  url: string
  thumbnailUrl: string | undefined
}

interface Props {
  /** A few recent gallery photos shown as a collage */
  photos: NudgePhoto[]
  totalCount: number | null
}

// Fanned stack: back-left, back-right, front-center
const FAN = [
  'left-[6%] top-[14%] -rotate-[9deg]',
  'right-[6%] top-[14%] rotate-[8deg]',
  'left-1/2 top-[4%] -translate-x-1/2 rotate-[-1deg] z-10',
]

export default function UploadNudge({ photos, totalCount }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return

    const t = setTimeout(() => {
      setVisible(true)
      sessionStorage.setItem(SESSION_KEY, '1')
    }, DELAY_MS)

    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!visible) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setVisible(false)
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [visible])

  if (!visible) return null

  const collage = photos.slice(0, 3)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-nudge-title"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={() => setVisible(false)}
        className="absolute inset-0 bg-ink/60 backdrop-blur-sm cursor-default"
      />

      <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl bg-surface shadow-lg animate-pop-in grid md:grid-cols-2">
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-surface/90 text-muted hover:text-ink hover:bg-subtle transition-colors"
          aria-label="Dismiss"
        >
          <X size={18} />
        </button>

        {/* Collage */}
        <div className="relative h-56 sm:h-64 md:h-auto md:min-h-[420px] bg-ink overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(194,65,12,0.35),transparent_65%)]" />
          {collage.length > 0 ? (
            collage.map((p, i) => (
              <div
                key={p.id}
                className={`absolute w-[38%] md:w-[52%] aspect-[4/5] rounded-lg overflow-hidden ring-4 ring-white shadow-lg ${FAN[i]}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.thumbnailUrl || p.url}
                  alt=""
                  className="block h-full w-full object-cover"
                />
              </div>
            ))
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Camera size={56} className="text-white/80" />
            </div>
          )}
        </div>

        {/* Copy */}
        <div className="flex flex-col justify-center px-6 py-7 sm:px-8 sm:py-9">
          <p className="font-mono text-[11px] tracking-[1px] uppercase text-mark">
            Your turn
          </p>
          <h2
            id="upload-nudge-title"
            className="mt-2 text-[28px] sm:text-[34px] leading-[1.08] font-semibold tracking-[-0.03em] text-ink"
          >
            Got a watch on your wrist? Show it off.
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
            One photo helps someone decide if a watch fits their wrist. Snap it,
            upload it and add the model details.
          </p>

          <ul className="mt-5 space-y-2 text-sm text-ink">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-mark" />
              Takes less than a minute
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-mark" />
              Get your own page in the gallery
            </li>
            {totalCount ? (
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-mark" />
                Join {totalCount.toLocaleString('en-US')} wrist shots already shared
              </li>
            ) : null}
          </ul>

          <Link
            href="/upload"
            onClick={() => setVisible(false)}
            className="mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ink px-6 text-[15px] font-semibold text-white hover:bg-ink-hover transition-colors"
          >
            <Camera size={18} />
            Add a wrist shot
          </Link>
          <button
            type="button"
            onClick={() => setVisible(false)}
            className="mt-3 text-sm text-faint hover:text-ink transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  )
}
