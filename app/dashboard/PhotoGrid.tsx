'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { WatchGroup as BaseWatchGroup } from './watchGroups'

interface Photo {
  id: string
  watchId: string
  slug: string | null
  url: string
  brandName: string | null
  modelName: string | null
  referenceNumber: string | null
  movement: string | null
  caseSize: string | null
  wristSize: string | null
  estimatedPrice: string | null
  lugToLug: string | null
  betweenLugs: string | null
  thickness: string | null
  waterResistance: string | null
  status: string
  rejectionReason: string | null
  createdAt: Date
}

type WatchGroup = BaseWatchGroup<Photo>

function PhotoThumb({ url, alt }: { url: string; alt: string }) {
  const [error, setError] = useState(false)
  if (error || !url || url.startsWith('/')) {
    return (
      <div className="flex items-center justify-center h-full text-faint">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
        </svg>
      </div>
    )
  }
  return (
    <Image
      src={url}
      alt={alt}
      fill
      className="object-cover"
      sizes="(max-width: 640px) 50vw, (max-width: 1200px) 33vw, 260px"
      onError={() => setError(true)}
    />
  )
}

const STATUS_BADGE: Record<string, { text: string; class: string }> = {
  approved: { text: 'Live',         class: 'bg-surface text-ink' },
  pending:  { text: 'In review',    class: 'bg-ink text-white' },
  rejected: { text: 'Not approved', class: 'bg-mark text-white' },
}

const FIELD_CONFIG = [
  { key: 'brandName',       label: 'Brand' },
  { key: 'modelName',       label: 'Model' },
  { key: 'referenceNumber', label: 'Reference #' },
  { key: 'movement',        label: 'Movement' },
  { key: 'caseSize',        label: 'Case Size' },
  { key: 'wristSize',       label: 'Wrist Size' },
  { key: 'estimatedPrice',  label: 'Price (USD)' },
  { key: 'lugToLug',        label: 'Lug-to-Lug (mm)' },
  { key: 'betweenLugs',     label: 'Between Lugs (mm)' },
  { key: 'thickness',       label: 'Thickness (mm)' },
  { key: 'waterResistance', label: 'Water Resistance' },
] as const

type EditableKey = typeof FIELD_CONFIG[number]['key']

function groupToEditable(photos: Photo[]): Record<EditableKey, string> {
  const fields: Record<EditableKey, string> = {
    brandName: '', modelName: '', referenceNumber: '', movement: '',
    caseSize: '', wristSize: '', estimatedPrice: '',
    lugToLug: '', betweenLugs: '', thickness: '', waterResistance: '',
  }
  for (const photo of photos) {
    for (const { key } of FIELD_CONFIG) {
      if (!fields[key]) fields[key] = photo[key] ?? ''
    }
  }
  return fields
}

interface PhotoStats {
  likes: Record<string, number>
  saves: Record<string, number>
}

function GroupCard({ group, stats }: { group: WatchGroup; stats: PhotoStats }) {
  const router = useRouter()
  const primary = group.photos[0]
  const alt = [primary.brandName, primary.modelName].filter(Boolean).join(' ') || 'Watch'

  const [menuOpen, setMenuOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [fields, setFields] = useState<Record<EditableKey, string>>(() => groupToEditable(group.photos))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const [addingPhoto, setAddingPhoto] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    window.addEventListener('pointerdown', handler)
    return () => window.removeEventListener('pointerdown', handler)
  }, [menuOpen])

  async function handleSave() {
    setSaving(true)
    setEditError(null)
    try {
      const statuses = await Promise.all(
        group.photos.map((photo) =>
          fetch(`/api/user/photos/${photo.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields }),
          }).then(async (res) => {
            const data = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(data.error ?? 'Save failed')
            return data.status as string | undefined
          })
        )
      )
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      setEditing(false)
      // Identity edits on approved photos are sent back for review
      if (statuses.includes('pending_review')) router.refresh()
    } catch (e) {
      setEditError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(e.target.files?.[0] ?? null)
    setUploadError(null)
    setUploadSuccess(false)
  }, [])

  async function handleUpload() {
    if (!selectedFile) return
    setUploading(true)
    setUploadError(null)
    try {
      const formData = new FormData()
      formData.append('photo', selectedFile)
      const res = await fetch(`/api/photos/${group.watchId}`, { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')
      setUploadSuccess(true)
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      setTimeout(() => router.refresh(), 1200)
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function handleDeleteGroup() {
    if (!confirm(`Delete all ${group.photos.length} photo(s) for this watch?`)) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await Promise.all(
        group.photos.map((photo) =>
          fetch(`/api/user/photos/${photo.id}`, { method: 'DELETE' }).then((res) => {
            if (!res.ok) throw new Error('Delete failed')
          })
        )
      )
      setTimeout(() => router.refresh(), 600)
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Delete failed')
      setDeleting(false)
    }
  }

  const badge = STATUS_BADGE[group.dominantStatus] ?? STATUS_BADGE.pending
  const isLive = group.dominantStatus === 'approved'
  const photoHref = `/photo/${primary.slug ?? primary.id}`
  const totalLikes = group.photos.reduce((sum, p) => sum + (stats.likes[p.id] || 0), 0)
  const totalSaves = group.photos.reduce((sum, p) => sum + (stats.saves[p.id] || 0), 0)
  const reference = fields.referenceNumber || primary.referenceNumber
  const brand = fields.brandName || primary.brandName
  const model = fields.modelName || primary.modelName || (brand ? '' : alt)

  const image = (
    <div className="relative aspect-[4/5] overflow-hidden rounded-md bg-surface">
      <PhotoThumb url={primary.url} alt={alt} />
      <span className={`absolute left-2.5 top-2.5 h-[26px] rounded-full flex items-center px-2.5 font-mono text-[10.5px] tracking-[0.8px] uppercase ${badge.class}`}>
        {badge.text}
      </span>
      {(group.photos.length > 1 || totalLikes > 0 || totalSaves > 0) && (
        <div className="absolute left-2.5 bottom-2.5 flex items-center gap-1.5">
          {group.photos.length > 1 && (
            <span className="h-6 rounded-full flex items-center px-2 bg-ink/70 text-white font-mono text-[10.5px] tracking-[0.5px]">
              {group.photos.length} photos
            </span>
          )}
          {totalLikes > 0 && (
            <span className="h-6 rounded-full flex items-center gap-1 px-2 bg-ink/70 text-white font-mono text-[10.5px]" title="Likes">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
              {totalLikes}
            </span>
          )}
          {totalSaves > 0 && (
            <span className="h-6 rounded-full flex items-center gap-1 px-2 bg-ink/70 text-white font-mono text-[10.5px]" title="Saves">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" /></svg>
              {totalSaves}
            </span>
          )}
        </div>
      )}
    </div>
  )

  const menuItem = 'w-full text-left h-10 px-3 text-sm text-ink hover:bg-subtle flex items-center gap-2 transition-colors'
  const inputClass = 'w-full h-10 text-sm bg-surface border border-line rounded-md px-3 text-ink placeholder:text-faint focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink'
  const primaryBtn = 'flex-1 h-10 rounded-full bg-ink text-white text-sm font-semibold hover:bg-ink-hover disabled:opacity-50 transition-colors'
  const secondaryBtn = 'flex-1 h-10 rounded-full border border-line-strong text-ink text-sm font-medium hover:bg-subtle transition-colors'

  return (
    <article className={`min-w-0 ${deleting ? 'opacity-50 pointer-events-none' : ''}`}>
      {isLive ? (
        <Link href={photoHref} className="block group rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-4 focus-visible:ring-offset-canvas">
          {image}
        </Link>
      ) : (
        image
      )}

      <div className="mt-2.5 flex items-start justify-between gap-2">
        <div className="min-w-0">
          {brand && (
            <p className="font-mono text-[11px] tracking-[1px] uppercase text-muted truncate">{brand}</p>
          )}
          {model && (
            <p className={`${brand ? 'mt-[3px]' : ''} text-base leading-snug font-semibold text-ink`}>{model}</p>
          )}
          {reference && (
            <p className="mt-0.5 font-mono text-xs text-faint truncate">Ref. {reference}</p>
          )}
          {saved && <p className="mt-1 text-xs font-medium text-winner">Saved</p>}
        </div>
        {/* Three-dot menu */}
        <div className="relative shrink-0 -mr-2 -mt-1.5" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-11 h-11 flex items-center justify-center text-muted hover:text-ink rounded-full hover:bg-subtle transition-colors"
            aria-label="Watch options"
            aria-expanded={menuOpen}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-surface rounded-md shadow-lg border border-line py-1 z-50">
              <button
                type="button"
                onClick={() => { setMenuOpen(false); setEditing(true); setAddingPhoto(false) }}
                className={menuItem}
              >
                Edit info
              </button>
              <button
                type="button"
                onClick={() => { setMenuOpen(false); setAddingPhoto(true); setEditing(false) }}
                className={menuItem}
              >
                Add photo
              </button>
              {isLive && (
                <Link href={photoHref} onClick={() => setMenuOpen(false)} className={menuItem}>
                  View in gallery
                </Link>
              )}
              <div className="border-t border-line my-1" />
              <button
                type="button"
                onClick={() => { setMenuOpen(false); handleDeleteGroup() }}
                className={`${menuItem} !text-mark`}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Rejection reason */}
      {group.dominantStatus === 'rejected' && primary.rejectionReason && (
        <div className="mt-2 border-l-2 border-mark pl-2.5">
          <p className="font-mono text-[10.5px] tracking-[0.8px] uppercase text-mark">Reason</p>
          <p className="mt-0.5 text-[13px] leading-snug text-muted">{primary.rejectionReason}</p>
        </div>
      )}

      {/* Edit form */}
      {editing && (
        <div className="mt-3 rounded-[10px] border border-line bg-surface p-3 space-y-2">
          {group.photos.length > 1 && (
            <p className="text-xs text-muted">
              Editing info for all {group.photos.length} photos of this watch
            </p>
          )}
          <div className="grid grid-cols-1 gap-2">
            {FIELD_CONFIG.map(({ key, label }) => (
              <div key={key}>
                <label htmlFor={`${group.watchId}-${key}`} className="block font-mono text-[10.5px] tracking-[0.8px] uppercase text-muted mb-1">{label}</label>
                <input
                  id={`${group.watchId}-${key}`}
                  type="text"
                  value={fields[key]}
                  onChange={(e) => setFields((prev) => ({ ...prev, [key]: e.target.value }))}
                  className={inputClass}
                  placeholder={label}
                />
              </div>
            ))}
          </div>
          {editError && <p className="text-xs text-mark">{editError}</p>}
          <div className="flex gap-2 pt-1">
            <button onClick={handleSave} disabled={saving} className={primaryBtn}>
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => { setEditing(false); setFields(groupToEditable(group.photos)) }} className={secondaryBtn}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Inline add photo */}
      {addingPhoto && (
        <div className="mt-3 rounded-[10px] border border-dashed border-line-strong bg-surface p-3 space-y-2">
          <p className="text-xs font-medium text-muted">Add another photo for this watch</p>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="block w-full text-sm text-muted file:mr-3 file:h-9 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-subtle file:text-ink hover:file:bg-line cursor-pointer" />
          {selectedFile && !uploadSuccess && (
            <p className="text-xs text-muted truncate">Selected: {selectedFile.name}</p>
          )}
          {uploadError && <p className="text-xs text-mark">{uploadError}</p>}
          {uploadSuccess && <p className="text-xs font-medium text-winner">Uploaded, now in review</p>}
          <div className="flex gap-2 pt-1">
            <button onClick={handleUpload} disabled={!selectedFile || uploading || uploadSuccess} className={primaryBtn}>
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
            <button onClick={() => { setAddingPhoto(false); setSelectedFile(null); setUploadError(null); if (fileInputRef.current) fileInputRef.current.value = '' }} className={secondaryBtn}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {deleteError && <p className="text-xs text-mark mt-2">{deleteError}</p>}
    </article>
  )
}

export default function PhotoGrid({ groups }: { groups: WatchGroup[] }) {
  const [stats, setStats] = useState<PhotoStats>({ likes: {}, saves: {} })

  useEffect(() => {
    fetch('/api/user/photos/stats')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setStats(data) })
      .catch(() => {})
  }, [])

  return (
    <div className="mt-6 grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-x-3 gap-y-6 sm:gap-x-[18px] sm:gap-y-7">
      {groups.map((group) => (
        <GroupCard key={group.watchId} group={group} stats={stats} />
      ))}
    </div>
  )
}
