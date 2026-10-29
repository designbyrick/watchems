'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import PhotoCountBadge from '@/components/ui/PhotoCountBadge'

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

interface WatchGroup {
  watchId: string
  photos: Photo[]
  dominantStatus: 'approved' | 'pending' | 'rejected'
}

function groupByWatch(photos: Photo[]): WatchGroup[] {
  const map = new Map<string, Photo[]>()
  for (const p of photos) {
    if (!map.has(p.watchId)) map.set(p.watchId, [])
    map.get(p.watchId)!.push(p)
  }
  return Array.from(map.entries()).map(([watchId, groupPhotos]) => {
    const sorted = [...groupPhotos].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
    const statuses = sorted.map((p) => p.status)
    const dominantStatus: WatchGroup['dominantStatus'] = statuses.includes('approved')
      ? 'approved'
      : statuses.includes('pending')
      ? 'pending'
      : 'rejected'
    return { watchId, photos: sorted, dominantStatus }
  })
}

function PhotoThumb({ url, alt }: { url: string; alt: string }) {
  const [error, setError] = useState(false)
  if (error || !url || url.startsWith('/')) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-1 text-gray-400">
        <span className="text-3xl">🖼️</span>
      </div>
    )
  }
  return (
    <Image
      src={url}
      alt={alt}
      fill
      className="object-cover"
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      onError={() => setError(true)}
    />
  )
}

const STATUS_BADGE: Record<string, { text: string; class: string }> = {
  approved: { text: 'Live', class: 'bg-green-100 text-green-800' },
  pending:  { text: 'Pending',  class: 'bg-yellow-100 text-yellow-800' },
  rejected: { text: 'Rejected', class: 'bg-red-100 text-red-800' },
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

  return (
    <div className={`rounded-xl border border-gray-200 bg-white ${deleting ? 'opacity-50 pointer-events-none' : ''}`}>
      {/* Thumbnail — links to photo page if approved */}
      <Link href={group.dominantStatus === 'approved' ? `/photo/${primary.slug ?? primary.id}` : '#'} className={group.dominantStatus !== 'approved' ? 'pointer-events-none' : ''}>
        <div className="relative w-full aspect-[4/3] bg-gray-100 rounded-t-xl overflow-hidden">
          <PhotoThumb url={primary.url} alt={alt} />
          <PhotoCountBadge count={group.photos.length} variant="badge" showIcon />
          <div className={`absolute bottom-2 left-2 text-[11px] font-medium px-2 py-0.5 rounded-full ${badge.class}`}>
            {badge.text}
          </div>
          {/* Community stats overlay */}
          {(() => {
            const totalLikes = group.photos.reduce((sum, p) => sum + (stats.likes[p.id] || 0), 0)
            const totalSaves = group.photos.reduce((sum, p) => sum + (stats.saves[p.id] || 0), 0)
            if (totalLikes === 0 && totalSaves === 0) return null
            return (
              <div className="absolute top-2 right-2 flex items-center gap-1.5">
                {totalLikes > 0 && (
                  <span className="flex items-center gap-0.5 text-[11px] text-white bg-black/40 rounded-full px-1.5 py-0.5">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
                    {totalLikes}
                  </span>
                )}
                {totalSaves > 0 && (
                  <span className="flex items-center gap-0.5 text-[11px] text-white bg-black/40 rounded-full px-1.5 py-0.5">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" /></svg>
                    {totalSaves}
                  </span>
                )}
              </div>
            )
          })()}
        </div>
      </Link>

      {/* Rejection reason banner */}
      {group.dominantStatus === 'rejected' && primary.rejectionReason && (
        <div className="mx-3 mt-3 flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          <svg className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
          </svg>
          <p className="text-xs text-red-700 leading-snug">{primary.rejectionReason}</p>
        </div>
      )}

      {/* Card body */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{alt}</p>
            {(fields.referenceNumber || primary.referenceNumber) && (
              <p className="text-xs text-gray-500 truncate">Ref. {fields.referenceNumber || primary.referenceNumber}</p>
            )}
          </div>
          {saved && <span className="text-xs text-green-600 font-medium shrink-0">Saved</span>}
          {/* Three-dot menu */}
          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
              aria-label="Watch options"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); setEditing(true); setAddingPhoto(false) }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                  </svg>
                  Edit Info
                </button>
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); setAddingPhoto(true); setEditing(false) }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Add Photo
                </button>
                {group.dominantStatus === 'approved' && (
                  <Link
                    href={`/photo/${primary.slug ?? primary.id}`}
                    onClick={() => setMenuOpen(false)}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                    View in Gallery
                  </Link>
                )}
                <div className="border-t border-gray-100 my-1" />
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); handleDeleteGroup() }}
                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Edit form */}
        {editing && (
          <div className="mt-3 space-y-2">
            {group.photos.length > 1 && (
              <p className="text-xs text-blue-600 bg-blue-50 rounded px-2 py-1">
                Editing info for all {group.photos.length} photos of this watch
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {FIELD_CONFIG.map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs text-gray-500 mb-0.5">{label}</label>
                  <input
                    type="text"
                    value={fields[key]}
                    onChange={(e) => setFields((prev) => ({ ...prev, [key]: e.target.value }))}
                    className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={label}
                  />
                </div>
              ))}
            </div>
            {editError && <p className="text-xs text-red-500">{editError}</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={handleSave} disabled={saving}
                className="flex-1 bg-blue-600 text-white text-sm font-medium py-1.5 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => { setEditing(false); setFields(groupToEditable(group.photos)) }}
                className="flex-1 border border-gray-300 text-gray-600 text-sm font-medium py-1.5 rounded hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Inline add photo */}
        {addingPhoto && (
          <div className="mt-3 rounded-md border border-dashed border-gray-300 bg-gray-50 p-3 space-y-2">
            <p className="text-xs text-gray-500 font-medium">Add another photo for this watch</p>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-600 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
            {selectedFile && !uploadSuccess && (
              <p className="text-xs text-gray-500 truncate">Selected: {selectedFile.name}</p>
            )}
            {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}
            {uploadSuccess && <p className="text-xs text-green-600 font-medium">Uploaded — pending review</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={handleUpload} disabled={!selectedFile || uploading || uploadSuccess}
                className="flex-1 bg-blue-600 text-white text-sm font-medium py-1.5 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
              <button onClick={() => { setAddingPhoto(false); setSelectedFile(null); setUploadError(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                className="flex-1 border border-gray-300 text-gray-600 text-sm font-medium py-1.5 rounded hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        {deleteError && <p className="text-xs text-red-500 mt-2">{deleteError}</p>}
      </div>
    </div>
  )
}

export default function PhotoGrid({ photos }: { photos: Photo[] }) {
  const allGroups = groupByWatch(photos)
  const [stats, setStats] = useState<PhotoStats>({ likes: {}, saves: {} })

  useEffect(() => {
    fetch('/api/user/photos/stats')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setStats(data) })
      .catch(() => {})
  }, [])

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {allGroups.map((group) => (
        <GroupCard key={group.watchId} group={group} stats={stats} />
      ))}
    </div>
  )
}
