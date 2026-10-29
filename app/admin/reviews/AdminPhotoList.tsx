'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { PendingPhoto } from '@/lib/photos'

interface Props {
  initialPhotos: PendingPhoto[]
  watchNames: Record<string, string>
}

export default function AdminPhotoList({ initialPhotos, watchNames }: Props) {
  const [photos, setPhotos] = useState(initialPhotos)
  const [loading, setLoading] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  async function act(action: 'approve' | 'delete', watchId: string, photoId: string) {
    setLoading(photoId)
    setMsg('')
    try {
      const res = await fetch('/api/admin/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, watchId, photoId }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setMsg(data.error ?? 'Error')
      } else {
        setPhotos((prev) => prev.filter((p) => p.id !== photoId))
        setMsg(action === 'approve' ? 'Photo approved.' : 'Photo deleted.')
      }
    } catch {
      setMsg('Network error.')
    } finally {
      setLoading(null)
    }
  }

  if (photos.length === 0) {
    return (
      <div className="card p-8 text-center text-muted">
        No pending photos.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {msg && <p className="text-sm text-ink">{msg}</p>}
      {photos.map((p) => (
        <div key={p.id} className="card p-5">
          <div className="flex gap-4">
            <div className="relative w-24 h-24 bg-canvas rounded-sm overflow-hidden shrink-0">
              <Image
                src={p.url}
                alt="Pending photo"
                fill
                className="object-cover"
                sizes="96px"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-ink text-xs font-semibold uppercase tracking-wider mb-1">
                {watchNames[p.watchId] ?? p.watchId}
              </p>
              <p className="text-ink text-sm font-semibold">{p.userName}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {p.wristSize && (
                  <span className="text-xs bg-subtle text-muted px-2 py-0.5 rounded-full">
                    {p.wristSize}
                  </span>
                )}
                <span className="text-faint text-xs">
                  {new Date(p.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
            <div className="flex gap-2 shrink-0 self-start">
              <button
                onClick={() => act('approve', p.watchId, p.id)}
                disabled={loading === p.id}
                className="px-3 py-1.5 text-xs rounded-sm bg-ink text-white font-semibold hover:bg-ink-hover transition-colors disabled:opacity-50"
              >
                Approve
              </button>
              <button
                onClick={() => act('delete', p.watchId, p.id)}
                disabled={loading === p.id}
                className="px-3 py-1.5 text-xs rounded-sm bg-canvas text-loser border border-line hover:bg-canvas transition-colors disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
