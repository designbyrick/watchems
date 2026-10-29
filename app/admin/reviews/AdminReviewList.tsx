'use client'

import { useState } from 'react'
import { Review } from '@/lib/reviews'
import type { PendingPhoto, ApprovedPhoto, Photo } from '@/lib/photos'
import Link from 'next/link'

const EDIT_FIELDS: { key: keyof Photo; label: string }[] = [
  { key: 'brandName', label: 'Brand' },
  { key: 'modelName', label: 'Model' },
  { key: 'referenceNumber', label: 'Reference #' },
  { key: 'movement', label: 'Movement' },
  { key: 'caseSize', label: 'Case Size' },
  { key: 'wristSize', label: 'Wrist Size' },
  { key: 'estimatedPrice', label: 'Est. Price' },
  { key: 'lugToLug', label: 'Lug-to-Lug' },
  { key: 'betweenLugs', label: 'Between Lugs' },
  { key: 'thickness', label: 'Thickness' },
  { key: 'waterResistance', label: 'Water Resistance' },
]

interface AdminModerationProps {
  initialReviews: Review[]
  initialPendingPhotos: PendingPhoto[]
  initialApprovedPhotos: ApprovedPhoto[]
}

export default function AdminReviewList({
  initialReviews,
  initialPendingPhotos,
  initialApprovedPhotos,
}: AdminModerationProps) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews)
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>(initialPendingPhotos)
  const [approvedPhotos, setApprovedPhotos] = useState<ApprovedPhoto[]>(initialApprovedPhotos)
  const [error, setError] = useState<string>('')
  const [processing, setProcessing] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editFields, setEditFields] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  // ── Reviews ────────────────────────────────────────────────────────────────

  const handleApproveReview = async (review: Review) => {
    try {
      setProcessing(review.id)
      const res = await fetch(`/api/admin/reviews/${review.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ watchSlug: review.watchSlug, action: 'approve' }),
      })
      if (!res.ok) throw new Error('Failed to approve review')
      setReviews((prev) => prev.filter((r) => r.id !== review.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setProcessing(null)
    }
  }

  const handleRejectReview = async (review: Review) => {
    try {
      setProcessing(review.id)
      const res = await fetch(`/api/admin/reviews/${review.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ watchSlug: review.watchSlug, action: 'reject' }),
      })
      if (!res.ok) throw new Error('Failed to reject review')
      setReviews((prev) => prev.filter((r) => r.id !== review.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setProcessing(null)
    }
  }

  // ── Photos ─────────────────────────────────────────────────────────────────

  const handlePhotoAction = async (action: 'approve' | 'delete', photo: PendingPhoto) => {
    setProcessing(photo.id)
    try {
      const res = await fetch('/api/admin/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, watchId: photo.watchId, photoId: photo.id }),
      })
      if (res.ok) {
        setPendingPhotos((prev) => prev.filter((p) => p.id !== photo.id))
        if (action === 'approve') {
          setApprovedPhotos((prev) => [{ ...photo, approved: true as const }, ...prev])
        }
      }
    } catch {
      // ignore
    }
    setProcessing(null)
  }

  const handleDeleteApproved = async (photo: ApprovedPhoto) => {
    setProcessing(photo.id)
    try {
      const res = await fetch('/api/admin/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete-approved', watchId: photo.watchId, photoId: photo.id }),
      })
      if (res.ok) setApprovedPhotos((prev) => prev.filter((p) => p.id !== photo.id))
    } catch {
      // ignore
    }
    setProcessing(null)
  }

  // ── Edit metadata ──────────────────────────────────────────────────────────

  const openEdit = (photo: PendingPhoto | ApprovedPhoto) => {
    const fields: Record<string, string> = {}
    for (const { key } of EDIT_FIELDS) {
      fields[key] = (photo[key] as string | null | undefined) ?? ''
    }
    setEditingId(photo.id)
    setEditFields(fields)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditFields({})
  }

  const saveEdit = async (photoId: string) => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/photos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoId, fields: editFields }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }
      // Update local state
      const patch = { ...editFields } as Partial<Photo>
      setPendingPhotos((prev) =>
        prev.map((p) => (p.id === photoId ? { ...p, ...patch } : p))
      )
      setApprovedPhotos((prev) =>
        prev.map((p) => (p.id === photoId ? { ...p, ...patch } : p))
      )
      setEditingId(null)
      setEditFields({})
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const pillPrimary = 'h-11 inline-flex items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-ink-hover transition-colors disabled:opacity-50'
  const pillSecondary = 'h-11 inline-flex items-center justify-center rounded-full border border-line-strong bg-surface px-5 text-sm font-medium text-ink hover:bg-subtle transition-colors disabled:opacity-50'
  const monoLabel = 'font-mono text-[11px] tracking-[1px] uppercase'
  const formatDate = (iso: string, withTime = false) =>
    new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    })

  const EditPanel = ({ photoId }: { photoId: string }) => (
    <div className="mt-3 rounded-[10px] border border-line bg-surface p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-3">
        {EDIT_FIELDS.map(({ key, label }) => (
          <label key={key} className="flex flex-col gap-1">
            <span className="font-mono text-[10.5px] tracking-[0.8px] uppercase text-muted">{label}</span>
            <input
              type="text"
              value={editFields[key] ?? ''}
              onChange={(e) => setEditFields((prev) => ({ ...prev, [key]: e.target.value }))}
              className="w-full h-10 text-sm bg-surface border border-line rounded-md px-3 text-ink focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink"
            />
          </label>
        ))}
      </div>
      <div className="flex gap-2 mt-4">
        <button type="button" onClick={() => saveEdit(photoId)} disabled={saving} className={pillPrimary}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={cancelEdit} disabled={saving} className={pillSecondary}>
          Cancel
        </button>
      </div>
    </div>
  )

  const sectionHeader = (title: string, count: number) => (
    <div className="flex items-baseline gap-3 pb-3 border-b border-line">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <span className="font-mono text-xs text-muted">{count}</span>
    </div>
  )

  const emptyRow = (message: string) => (
    <p className="py-10 text-center text-[15px] text-muted border-b border-line">{message}</p>
  )

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-8 pb-16">

      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[32px] sm:text-[40px] leading-tight font-semibold tracking-[-0.04em] text-ink">Moderation queue</h1>
          <p className="mt-2 font-mono text-xs text-muted">
            {pendingPhotos.length} photo{pendingPhotos.length !== 1 ? 's' : ''} · {reviews.length} review{reviews.length !== 1 ? 's' : ''} pending
          </p>
        </div>
        <Link href="/admin" className={pillSecondary}>Back to admin</Link>
      </div>

      {error && (
        <div role="alert" className="mt-6 border-l-2 border-mark bg-surface rounded-r-md px-4 py-3 text-sm text-ink">{error}</div>
      )}

      {/* ── Pending Reviews ── */}
      <section className="mt-10">
        {sectionHeader('Pending reviews', reviews.length)}

        {reviews.length === 0 ? (
          emptyRow('No pending reviews to moderate')
        ) : (
          <ul>
            {reviews.map((review) => (
              <li key={review.id} className="py-5 border-b border-line flex flex-col md:flex-row md:items-start gap-4">
                <div className="flex-1 min-w-0">
                  <p className={`${monoLabel} text-muted truncate`}>
                    {review.watchSlug} · {review.rating}/5
                  </p>
                  <h3 className="mt-1 text-base font-semibold text-ink">{review.title}</h3>
                  <p className="mt-0.5 font-mono text-xs text-muted truncate">User {review.userId}</p>
                  <p className="mt-3 text-[15px] leading-relaxed text-ink">{review.body}</p>
                  {(review.pros.length > 0 || review.cons.length > 0) && (
                    <div className="mt-4 grid sm:grid-cols-2 gap-4">
                      <div>
                        <h4 className={`${monoLabel} text-muted mb-1.5`}>Pros</h4>
                        <ul className="text-sm text-ink space-y-1">
                          {review.pros.map((p, i) => <li key={i} className="pl-3 border-l border-line">{p}</li>)}
                        </ul>
                      </div>
                      <div>
                        <h4 className={`${monoLabel} text-muted mb-1.5`}>Cons</h4>
                        <ul className="text-sm text-ink space-y-1">
                          {review.cons.map((c, i) => <li key={i} className="pl-3 border-l border-mark">{c}</li>)}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleApproveReview(review)}
                    disabled={processing === review.id}
                    className={pillPrimary}
                  >
                    {processing === review.id ? 'Processing…' : 'Approve'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRejectReview(review)}
                    disabled={processing === review.id}
                    className={pillSecondary}
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Pending Photos ── */}
      <section className="mt-12">
        {sectionHeader('Pending photos', pendingPhotos.length)}

        {pendingPhotos.length === 0 ? (
          emptyRow('No photos pending review')
        ) : (
          <ul>
            {pendingPhotos.map((photo) => (
              <li key={photo.id} className="py-4 border-b border-line">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-16 aspect-[4/5] shrink-0 bg-subtle rounded-md overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.url} alt="Pending submission" className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className={`${monoLabel} text-muted truncate`}>{photo.watchId}</p>
                      <p className="mt-[3px] text-base font-semibold text-ink truncate">{photo.userName}</p>
                      <p className="mt-0.5 font-mono text-xs text-muted">{formatDate(photo.createdAt, true)}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handlePhotoAction('approve', photo)}
                      disabled={processing === photo.id}
                      className={pillPrimary}
                    >
                      {processing === photo.id ? 'Processing…' : 'Approve'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePhotoAction('delete', photo)}
                      disabled={processing === photo.id}
                      className={pillSecondary}
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => editingId === photo.id ? cancelEdit() : openEdit(photo)}
                      className={pillSecondary}
                    >
                      {editingId === photo.id ? 'Close' : 'Edit'}
                    </button>
                  </div>
                </div>
                {editingId === photo.id && <EditPanel photoId={photo.id} />}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Approved Photos (Gallery) ── */}
      <section className="mt-12">
        {sectionHeader('Gallery, approved', approvedPhotos.length)}

        {approvedPhotos.length === 0 ? (
          emptyRow('No approved photos yet')
        ) : (
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-x-3 gap-y-7 sm:gap-x-[18px]">
            {approvedPhotos.map((photo) => (
              <article key={photo.id} className="min-w-0 flex flex-col">
                <div className="relative w-full aspect-[4/5] bg-surface rounded-md overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.url} alt={`Approved — ${photo.watchId}`} className="w-full h-full object-cover" />
                  <span className="absolute left-2.5 top-2.5 h-[26px] rounded-full flex items-center px-2.5 bg-surface text-ink font-mono text-[10.5px] tracking-[0.8px] uppercase">
                    Live
                  </span>
                </div>
                <p className={`mt-2.5 ${monoLabel} text-muted truncate`}>{photo.watchId}</p>
                <p className="mt-[3px] text-sm font-semibold text-ink truncate">{photo.userName}</p>
                <p className="mt-0.5 font-mono text-xs text-muted">{formatDate(photo.createdAt)}</p>
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => editingId === photo.id ? cancelEdit() : openEdit(photo)}
                    className={`${pillSecondary} flex-1 px-3`}
                  >
                    {editingId === photo.id ? 'Close' : 'Edit'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteApproved(photo)}
                    disabled={processing === photo.id}
                    className={`${pillSecondary} flex-1 px-3 !text-mark`}
                  >
                    {processing === photo.id ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
                {editingId === photo.id && <EditPanel photoId={photo.id} />}
              </article>
            ))}
          </div>
        )}
      </section>

    </div>
  )
}
