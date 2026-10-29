'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'

const SESSION_KEY = 'watchems_upload_nudge_seen'
const DELAY_MS = 3000

export default function UploadNudge() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return

    const t = setTimeout(() => {
      setVisible(true)
      sessionStorage.setItem(SESSION_KEY, '1')
    }, DELAY_MS)

    return () => clearTimeout(t)
  }, [])

  if (!visible) return null

  return (
    <div
      className="fixed bottom-4 right-4 left-4 sm:left-auto sm:bottom-6 sm:right-6 z-50 sm:max-w-sm animate-slide-up"
      role="status"
      aria-live="polite"
    >
      <div className="bg-ink text-white rounded-2xl shadow-lg px-5 py-5 flex items-start gap-4">

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-base leading-snug">
            Got a watch on your wrist?
          </p>
          <p className="text-white/60 text-sm mt-1 leading-relaxed">
            Share a photo and help other enthusiasts see it in the wild.
          </p>
          <Link
            href="/upload"
            onClick={() => setVisible(false)}
            className="inline-flex items-center h-10 mt-3 text-sm font-semibold bg-white text-ink rounded-full px-4 hover:bg-canvas transition-colors"
          >
            Add a wrist shot
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setVisible(false)}
          className="text-white/50 hover:text-white transition-colors shrink-0 -mt-0.5 -mr-1"
          aria-label="Dismiss"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  )
}
