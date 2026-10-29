'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface BoardPhoto {
  id: string
  slug: string | null
  url: string
  thumbnailUrl: string | null
  brandName: string | null
  modelName: string | null
  referenceNumber: string | null
  userName: string
  watchId: string
  savedAt: string
}

interface BoardData {
  id: string
  name: string
  createdAt: string
  photos: BoardPhoto[]
}

function unslugify(slug: string) {
  return slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export default function BoardDetailClient({ boardId }: { boardId: string }) {
  const router = useRouter()
  const [board, setBoard] = useState<BoardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchBoard = useCallback(async () => {
    try {
      const res = await fetch(`/api/collections/${boardId}`)
      if (!res.ok) {
        setError(true)
        return
      }
      const data = await res.json()
      setBoard(data)
      setEditName(data.name)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [boardId])

  useEffect(() => { fetchBoard() }, [fetchBoard])

  async function handleRename() {
    const name = editName.trim()
    if (!name || !board) return
    setSaving(true)
    try {
      const res = await fetch(`/api/collections/${boardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (res.ok) {
        setBoard({ ...board, name })
        setEditing(false)
      }
    } catch (err) {
      console.error('Failed to rename:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleRemovePhoto(photoId: string) {
    if (!board) return
    setRemoving(photoId)
    try {
      await fetch(`/api/collections/${boardId}/items?photoId=${photoId}`, { method: 'DELETE' })
      setBoard({ ...board, photos: board.photos.filter((p) => p.id !== photoId) })
    } catch (err) {
      console.error('Failed to remove photo:', err)
    } finally {
      setRemoving(null)
    }
  }

  async function handleDeleteBoard() {
    if (!confirm('Delete this collection? Photos won\'t be deleted, only removed from the collection.')) return
    setDeleting(true)
    try {
      await fetch(`/api/collections/${boardId}`, { method: 'DELETE' })
      router.push('/dashboard/boards')
    } catch (err) {
      console.error('Failed to delete board:', err)
      setDeleting(false)
    }
  }

  const gridClass = 'mt-7 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-[repeat(auto-fill,minmax(232px,1fr))] sm:gap-x-5 sm:gap-y-9'

  if (loading) {
    return (
      <div className="px-4 py-8 sm:px-8 lg:px-10 lg:pb-16">
        <div className="h-4 w-28 animate-pulse rounded bg-subtle" />
        <div className="mt-4 h-10 w-64 animate-pulse rounded bg-subtle" />
        <div className={gridClass}>
          {[...Array(8)].map((_, i) => (
            <div key={i} aria-hidden="true">
              <div className="aspect-[4/5] animate-pulse rounded-md bg-subtle" />
              <div className="mt-3 h-2.5 w-16 animate-pulse rounded bg-subtle" />
              <div className="mt-2 h-3.5 w-3/4 animate-pulse rounded bg-subtle" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error || !board) {
    return (
      <div className="px-4 py-8 sm:px-8 lg:px-10 lg:pb-16">
        <div className="mx-auto max-w-md py-16 text-center">
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink">Collection not found</h1>
          <p className="mt-2 text-[15px] text-muted">This collection doesn&apos;t exist or you don&apos;t have access.</p>
          <Link
            href="/dashboard/boards"
            className="mt-6 inline-flex h-11 items-center rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-ink-hover"
          >
            Back to collections
          </Link>
        </div>
      </div>
    )
  }

  const count = board.photos.length

  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10 lg:pb-16">
      {/* Back link */}
      <Link
        href="/dashboard/boards"
        className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[1px] text-muted transition-colors hover:text-ink"
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m15 18-6-6 6-6" />
        </svg>
        Collections
      </Link>

      {/* Header */}
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          {editing ? (
            <form
              onSubmit={(e) => { e.preventDefault(); handleRename() }}
              className="flex max-w-[640px] flex-wrap items-center gap-2"
            >
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Escape') { setEditing(false); setEditName(board.name) } }}
                maxLength={100}
                autoFocus
                aria-label="Collection name"
                className="h-12 min-w-0 flex-[1_1_240px] rounded-md border border-line bg-surface px-3 text-xl font-semibold text-ink focus:border-ink focus:outline-none"
              />
              <button
                type="button"
                onClick={() => { setEditing(false); setEditName(board.name) }}
                className="h-11 rounded-full border border-line px-4 text-sm font-semibold text-ink hover:bg-subtle"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="h-11 rounded-full bg-ink px-[18px] text-sm font-semibold text-white hover:bg-ink-hover disabled:opacity-50"
              >
                Save
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="min-w-0 break-words text-[32px] font-semibold leading-tight tracking-[-0.04em] text-ink sm:text-[40px]">{board.name}</h1>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-faint transition-colors hover:bg-subtle hover:text-ink"
                aria-label="Rename collection"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                </svg>
              </button>
            </div>
          )}
          <p className="mt-2 font-mono text-xs text-muted">
            {count} {count === 1 ? 'watch' : 'watches'} · Only you can see this
          </p>
        </div>
        <button
          type="button"
          onClick={handleDeleteBoard}
          disabled={deleting}
          className="h-11 shrink-0 rounded-full border border-line px-4 text-sm font-semibold text-mark transition-colors hover:border-mark disabled:opacity-50"
        >
          {deleting ? 'Deleting…' : 'Delete collection'}
        </button>
      </div>

      {/* Photos grid */}
      {count === 0 ? (
        <div className="mt-7 flex flex-col items-center rounded-[10px] border border-dashed border-line-strong px-6 py-16 text-center">
          <p className="text-[17px] font-semibold text-ink">This collection is empty</p>
          <p className="mt-1.5 max-w-sm text-sm text-muted">Tap the bookmark on any photo in the gallery to save it here.</p>
          <Link
            href="/"
            className="mt-5 inline-flex h-11 items-center rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-ink-hover"
          >
            Browse the gallery
          </Link>
        </div>
      ) : (
        <div className={gridClass}>
          {board.photos.map((photo) => {
            const title = photo.modelName || photo.referenceNumber || unslugify(photo.watchId)
            return (
              <article key={photo.id} className="group relative min-w-0">
                <Link href={`/photo/${photo.slug ?? photo.id}`} className="block">
                  <div className="aspect-[4/5] overflow-hidden rounded-md bg-surface">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.thumbnailUrl || photo.url}
                      alt={`${photo.brandName || 'Watch'} ${photo.modelName || ''} by ${photo.userName}`.replace(/\s+/g, ' ')}
                      className="block h-full w-full object-cover transition-transform duration-[350ms] ease-out group-hover:scale-[1.035]"
                      loading="lazy"
                    />
                  </div>
                  {photo.brandName && (
                    <p className="mt-2 truncate font-mono text-[10.5px] uppercase tracking-[0.8px] text-muted sm:mt-3 sm:text-[11px] sm:tracking-[1px]">
                      {photo.brandName}
                    </p>
                  )}
                  <p className={`${photo.brandName ? 'mt-[3px] sm:mt-1' : 'mt-2 sm:mt-3'} text-[15px] font-semibold leading-[1.25] tracking-[-0.2px] text-ink sm:text-[17px]`}>
                    {title}
                  </p>
                </Link>
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(photo.id)}
                  disabled={removing === photo.id}
                  className="absolute right-2.5 top-2.5 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-ink shadow-sm transition-opacity hover:bg-white focus-visible:opacity-100 group-hover:opacity-100 disabled:opacity-50 [@media(hover:hover)]:opacity-0"
                  aria-label="Remove from collection"
                  title="Remove from collection"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2} strokeLinecap="round" aria-hidden="true">
                    <path d="M6 18L18 6M6 6l12 12" />
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
