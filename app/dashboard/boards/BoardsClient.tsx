'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'

interface LikedStats {
  count: number
  coverUrls: string[]
}

interface BoardSummary {
  id: string
  name: string
  coverUrl: string | null
  coverUrls?: string[]
  itemCount: number
  createdAt: string
}

const SUGGESTED_BOARDS = [
  'Wishlist',
  'Grail Watches',
  'Daily Beaters',
  'Dress Watches',
  'Dive Collection',
  'Vintage Finds',
]

/** 4:3 cover: one tall image on the left, two stacked on the right. Missing slots stay as quiet fills. */
function Mosaic({ urls, alt }: { urls: string[]; alt: string }) {
  const slots = [urls[0], urls[1], urls[2]]
  return (
    <div className="grid aspect-[4/3] grid-cols-[2fr_1fr] grid-rows-2 gap-[3px] overflow-hidden rounded-[10px] bg-line transition-opacity group-hover:opacity-[0.92]">
      {slots.map((src, i) =>
        src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={src}
            alt={i === 0 ? alt : ''}
            loading="lazy"
            className={`block h-full w-full object-cover ${i === 0 ? 'row-span-2' : ''}`}
          />
        ) : (
          <div key={i} className={`bg-subtle ${i === 0 ? 'row-span-2' : ''}`} />
        )
      )}
    </div>
  )
}

function countLabel(n: number) {
  return `${n} ${n === 1 ? 'watch' : 'watches'}`
}

export default function CollectionsClient() {
  const [boards, setBoards] = useState<BoardSummary[]>([])
  const [liked, setLiked] = useState<LikedStats>({ count: 0, coverUrls: [] })
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameName, setRenameName] = useState('')
  const [saving, setSaving] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const fetchCollections = useCallback(async () => {
    try {
      const [colRes, likedRes] = await Promise.all([
        fetch('/api/collections'),
        fetch('/api/user/liked'),
      ])
      if (colRes.ok) {
        const data = await colRes.json()
        setBoards(data.collections)
      }
      if (likedRes.ok) {
        const data = await likedRes.json()
        const photos: { thumbnailUrl: string | null; url: string }[] = data.photos || []
        setLiked({
          count: photos.length,
          coverUrls: photos.slice(0, 3).map((p) => p.thumbnailUrl || p.url),
        })
      }
    } catch (err) {
      console.error('Failed to fetch collections:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCollections() }, [fetchCollections])

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(null)
      }
    }
    window.addEventListener('pointerdown', handler)
    return () => window.removeEventListener('pointerdown', handler)
  }, [menuOpen])

  async function handleCreate(name?: string) {
    const boardName = (name || newName).trim()
    if (!boardName) return
    setCreating(true)
    try {
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: boardName }),
      })
      if (res.ok) {
        setNewName('')
        setShowCreate(false)
        await fetchCollections()
      }
    } catch (err) {
      console.error('Failed to create board:', err)
    } finally {
      setCreating(false)
    }
  }

  async function handleRename(boardId: string) {
    const name = renameName.trim()
    if (!name) return
    setSaving(true)
    try {
      const res = await fetch(`/api/collections/${boardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (res.ok) {
        setBoards((prev) => prev.map((b) => b.id === boardId ? { ...b, name } : b))
        setRenaming(null)
      }
    } catch (err) {
      console.error('Failed to rename:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(boardId: string) {
    if (!confirm('Delete this collection? Photos won\'t be deleted, only removed from the collection.')) return
    try {
      await fetch(`/api/collections/${boardId}`, { method: 'DELETE' })
      setBoards((prev) => prev.filter((b) => b.id !== boardId))
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  function cancelCreate() {
    setShowCreate(false)
    setNewName('')
  }

  const existingNames = new Set(boards.map((b) => b.name.toLowerCase()))
  const availableSuggestions = SUGGESTED_BOARDS.filter((s) => !existingNames.has(s.toLowerCase()))

  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10 lg:pb-16">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-semibold leading-tight tracking-[-0.04em] text-ink sm:text-[40px]">Collections</h1>
          <p className="mt-2 text-[15px] text-muted">Save watches into themed boards. Only you can see them.</p>
        </div>
        {!showCreate && (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex h-12 items-center gap-2 rounded-full bg-ink px-5 text-[15px] font-semibold text-white transition-colors hover:bg-ink-hover"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New collection
          </button>
        )}
      </div>

      {/* Inline create form */}
      {showCreate && (
        <form
          onSubmit={(e) => { e.preventDefault(); handleCreate() }}
          className="mt-5 max-w-[640px] rounded-[10px] border border-line bg-surface p-4"
        >
          <div className="flex flex-wrap items-end gap-2.5">
            <div className="min-w-0 flex-[1_1_260px]">
              <label htmlFor="board-name" className="mb-1.5 block text-[13px] font-medium text-ink">Collection name</label>
              <input
                id="board-name"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Escape') cancelCreate() }}
                placeholder="e.g. Grail divers"
                maxLength={100}
                autoFocus
                className="h-11 w-full rounded-md border border-line bg-surface px-3 text-[15px] text-ink placeholder:text-faint focus:border-ink focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={cancelCreate}
              className="h-11 rounded-full border border-line px-4 text-sm font-semibold text-ink transition-colors hover:bg-subtle"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || !newName.trim()}
              className="h-11 rounded-full bg-ink px-[18px] text-sm font-semibold text-white transition-colors hover:bg-ink-hover disabled:opacity-50"
            >
              {creating ? 'Saving…' : 'Save'}
            </button>
          </div>
          {availableSuggestions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
              {availableSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => handleCreate(suggestion)}
                  disabled={creating}
                  className="h-8 rounded-full bg-subtle px-3 text-[13px] font-medium text-muted transition-colors hover:bg-line hover:text-ink"
                >
                  + {suggestion}
                </button>
              ))}
            </div>
          )}
        </form>
      )}

      {/* Boards */}
      {loading ? (
        <div className="mt-7 grid grid-cols-[repeat(auto-fill,minmax(min(280px,100%),1fr))] gap-x-5 gap-y-8">
          {[...Array(4)].map((_, i) => (
            <div key={i}>
              <div className="aspect-[4/3] animate-pulse rounded-[10px] bg-subtle" />
              <div className="mt-3 h-5 w-1/2 animate-pulse rounded bg-subtle" />
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-7 grid grid-cols-[repeat(auto-fill,minmax(min(280px,100%),1fr))] gap-x-5 gap-y-8">
          {/* Liked Watches — system collection, always first */}
          <Link href="/dashboard/liked" className="group block min-w-0">
            <Mosaic urls={liked.coverUrls} alt="Liked Watches" />
            <div className="mt-3 flex items-baseline justify-between gap-2">
              <span className="truncate text-lg font-semibold tracking-[-0.02em] text-ink">Liked Watches</span>
              <span className="shrink-0 font-mono text-xs text-muted">{countLabel(liked.count)}</span>
            </div>
          </Link>

          {boards.map((board) => {
            const covers = board.coverUrls ?? (board.coverUrl ? [board.coverUrl] : [])
            return (
              <div key={board.id} className="group relative min-w-0">
                <Link href={`/dashboard/boards/${board.id}`} className="block">
                  <Mosaic urls={covers} alt={board.name} />
                </Link>

                {renaming === board.id ? (
                  <form
                    onSubmit={(e) => { e.preventDefault(); handleRename(board.id) }}
                    className="mt-3 flex items-center gap-2"
                  >
                    <input
                      type="text"
                      value={renameName}
                      onChange={(e) => setRenameName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Escape') setRenaming(null) }}
                      maxLength={100}
                      autoFocus
                      aria-label="Collection name"
                      className="h-9 min-w-0 flex-1 rounded-md border border-line bg-surface px-2.5 text-[15px] text-ink focus:border-ink focus:outline-none"
                    />
                    <button type="button" onClick={() => setRenaming(null)} className="h-9 px-2 text-[13px] font-semibold text-muted hover:text-ink">Cancel</button>
                    <button type="submit" disabled={saving} className="h-9 rounded-full bg-ink px-3.5 text-[13px] font-semibold text-white hover:bg-ink-hover disabled:opacity-50">Save</button>
                  </form>
                ) : (
                  <Link href={`/dashboard/boards/${board.id}`} className="mt-3 flex items-baseline justify-between gap-2">
                    <span className="truncate text-lg font-semibold tracking-[-0.02em] text-ink">{board.name}</span>
                    <span className="shrink-0 font-mono text-xs text-muted">{countLabel(board.itemCount)}</span>
                  </Link>
                )}

                {/* Options menu, over the cover */}
                <div className="absolute right-2 top-2" ref={menuOpen === board.id ? menuRef : undefined}>
                  <button
                    type="button"
                    onClick={() => setMenuOpen(menuOpen === board.id ? null : board.id)}
                    className={`flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-ink shadow-sm transition-opacity hover:bg-white focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:hover)]:opacity-0 ${menuOpen === board.id ? '!opacity-100' : ''}`}
                    aria-label={`Options for ${board.name}`}
                    aria-expanded={menuOpen === board.id}
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path d="M4 10a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM8.5 10a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM13 10a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" />
                    </svg>
                  </button>
                  {menuOpen === board.id && (
                    <div className="absolute right-0 top-full z-50 mt-1 w-36 rounded-lg border border-line bg-surface py-1 shadow-md">
                      <button
                        type="button"
                        onClick={() => {
                          setRenaming(board.id)
                          setRenameName(board.name)
                          setMenuOpen(null)
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-ink hover:bg-subtle"
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        onClick={() => { setMenuOpen(null); handleDelete(board.id) }}
                        className="w-full px-3 py-2 text-left text-sm text-mark hover:bg-subtle"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* Nudge when only the Liked board exists */}
          {boards.length === 0 && !showCreate && (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="group flex min-w-0 flex-col text-left"
            >
              <span className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-[10px] border border-dashed border-line-strong px-6 text-center transition-colors group-hover:border-ink">
                <span className="text-[15px] font-semibold text-ink">Start a collection</span>
                <span className="text-[13px] text-muted">Group saved watches by theme. Tap the bookmark on any photo to save it.</span>
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
