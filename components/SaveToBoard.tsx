'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useIsSignedIn } from '@/lib/useIsSignedIn'

interface Board {
  id: string
  name: string
}

interface SaveToBoardProps {
  photoId: string
  /** 'card' small icon overlay, 'tile' 44px gallery-tile bookmark (shown on hover), 'button' 52px pill */
  variant?: 'card' | 'tile' | 'button'
  className?: string
}

export default function SaveToBoard({ photoId, variant = 'card', className = '' }: SaveToBoardProps) {
  const isSignedIn = useIsSignedIn()
  const [open, setOpen] = useState(false)
  const [boards, setBoards] = useState<Board[]>([])
  const [savedIn, setSavedIn] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [toggling, setToggling] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    window.addEventListener('pointerdown', handler)
    return () => window.removeEventListener('pointerdown', handler)
  }, [open])

  // Check saved status on mount for signed-in users
  useEffect(() => {
    if (!isSignedIn) return
    fetch(`/api/photo/${photoId}/saved`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.savedIn?.length) setSavedIn(new Set(data.savedIn)) })
      .catch(() => {})
  }, [photoId, isSignedIn])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [boardsRes, savedRes] = await Promise.all([
        fetch('/api/collections'),
        fetch(`/api/photo/${photoId}/saved`),
      ])
      if (boardsRes.ok) {
        const data = await boardsRes.json()
        setBoards(data.collections.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })))
      }
      if (savedRes.ok) {
        const data = await savedRes.json()
        setSavedIn(new Set(data.savedIn))
      }
    } catch (err) {
      console.error('Failed to fetch boards:', err)
    } finally {
      setLoading(false)
    }
  }, [photoId])

  function handleOpen(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!isSignedIn) {
      window.location.href = '/sign-in'
      return
    }
    setOpen(true)
    fetchData()
  }

  async function toggleBoard(boardId: string) {
    setToggling(boardId)
    const isSaved = savedIn.has(boardId)
    try {
      if (isSaved) {
        await fetch(`/api/collections/${boardId}/items?photoId=${photoId}`, { method: 'DELETE' })
        setSavedIn((prev) => { const next = new Set(prev); next.delete(boardId); return next })
      } else {
        await fetch(`/api/collections/${boardId}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photoId }),
        })
        setSavedIn((prev) => new Set(prev).add(boardId))
      }
    } catch (err) {
      console.error('Failed to toggle save:', err)
    } finally {
      setToggling(null)
    }
  }

  async function handleCreate() {
    const name = newName.trim()
    if (!name) return
    setCreating(true)
    try {
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (res.ok) {
        const data = await res.json()
        setBoards((prev) => [...prev, { id: data.id, name: data.name }])
        setNewName('')
        // Auto-save to new board
        await fetch(`/api/collections/${data.id}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photoId }),
        })
        setSavedIn((prev) => new Set(prev).add(data.id))
      }
    } catch (err) {
      console.error('Failed to create board:', err)
    } finally {
      setCreating(false)
    }
  }

  const isSavedAnywhere = savedIn.size > 0

  const bookmarkIcon = (
    <svg
      className={variant === 'card' ? 'w-3.5 h-3.5' : 'w-[18px] h-[18px]'}
      fill={isSavedAnywhere ? 'currentColor' : 'none'}
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
    </svg>
  )

  return (
    <div ref={menuRef} className={`relative ${className}`} onClick={(e) => e.stopPropagation()}>
      {/* Trigger button */}
      {variant === 'tile' ? (
        <button
          type="button"
          onClick={handleOpen}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-opacity duration-150 ${
            isSavedAnywhere || open
              ? 'bg-ink text-white'
              : 'bg-[rgba(14,15,15,0.72)] text-white opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:hidden'
          }`}
          aria-label={isSavedAnywhere ? 'Saved to a board' : 'Save to a board'}
          aria-pressed={isSavedAnywhere}
        >
          {bookmarkIcon}
        </button>
      ) : variant === 'card' ? (
        <button
          type="button"
          onClick={handleOpen}
          className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
            isSavedAnywhere
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-black/40 text-white sm:opacity-0 sm:group-hover:opacity-100 hover:bg-black/60'
          }`}
          aria-label="Save to collection"
        >
          {bookmarkIcon}
        </button>
      ) : (
        <button
          type="button"
          onClick={handleOpen}
          aria-pressed={isSavedAnywhere}
          className="w-full h-[52px] rounded-full bg-ink text-white hover:bg-ink-hover flex items-center justify-center gap-2 text-base font-semibold transition-colors"
        >
          {bookmarkIcon}
          {isSavedAnywhere ? 'Saved to a board' : 'Save to a board'}
        </button>
      )}

      {/* Dropdown */}
      {open && (
        <div className={`absolute z-50 bg-surface rounded-xl shadow-md border border-line w-56 py-2 ${
          variant === 'card' ? 'top-10 right-0' : variant === 'tile' ? 'top-12 right-0' : 'top-full mt-2 left-0'
        }`}>
          <p className="px-3 py-1 font-mono text-[11px] tracking-[1px] uppercase text-muted">Save to a board</p>

          {loading ? (
            <div className="px-3 py-4 text-center text-sm text-faint">Loading…</div>
          ) : (
            <>
              <div className="max-h-48 overflow-y-auto">
                {boards.map((board) => (
                  <button
                    key={board.id}
                    type="button"
                    onClick={() => toggleBoard(board.id)}
                    disabled={toggling === board.id}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-canvas transition-colors text-left"
                  >
                    <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      savedIn.has(board.id) ? 'bg-ink border-ink text-white' : 'border-line-strong'
                    }`}>
                      {savedIn.has(board.id) && (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    <span className="truncate">{board.name}</span>
                  </button>
                ))}
              </div>

              {/* Create new board */}
              <div className="border-t border-line mt-1 pt-1">
                <div className="px-3 py-1.5">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="New board name…"
                    className="w-full px-2 py-1.5 border border-line rounded-md text-sm text-ink placeholder:text-faint focus:outline-none focus:border-line-strong"
                    maxLength={100}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
                  />
                  {newName.trim() && (
                    <button
                      type="button"
                      onClick={handleCreate}
                      disabled={creating}
                      className="mt-1.5 w-full text-center text-xs font-medium text-ink hover:underline py-1"
                    >
                      {creating ? 'Creating...' : `Create "${newName.trim()}" & save`}
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
