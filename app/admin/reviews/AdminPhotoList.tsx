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
      <div className="rounded-[10px] border border-dashed border-line-strong px-6 py-14 text-center text-[15px] text-muted">
        No pending photos.
      </div>
    )
  }

  return (
    <div>
      {msg && <p role="status" className="mb-3 font-mono text-xs text-muted">{msg}</p>}
      <ul className="border-t border-line">
        {photos.map((p) => (
          <li key={p.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 py-4 border-b border-line">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="relative w-16 aspect-[4/5] bg-subtle rounded-md overflow-hidden shrink-0">
                <Image
                  src={p.url}
                  alt="Pending photo"
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </div>
              <div className="min-w-0">
                <p className="font-mono text-[11px] tracking-[1px] uppercase text-muted truncate">
                  {watchNames[p.watchId] ?? p.watchId}
                </p>
                <p className="mt-[3px] text-base font-semibold text-ink truncate">{p.userName}</p>
                <p className="mt-0.5 font-mono text-xs text-muted">
                  {p.wristSize && <>{p.wristSize} · </>}
                  {new Date(p.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => act('approve', p.watchId, p.id)}
                disabled={loading === p.id}
                className="h-11 inline-flex items-center rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-ink-hover transition-colors disabled:opacity-50"
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => act('delete', p.watchId, p.id)}
                disabled={loading === p.id}
                className="h-11 inline-flex items-center rounded-full border border-line-strong bg-surface px-5 text-sm font-medium text-ink hover:bg-subtle transition-colors disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
