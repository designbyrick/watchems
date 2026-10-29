'use client'

import { useState, useEffect, useMemo, useCallback, useRef, useId } from 'react'
import dynamic from 'next/dynamic'
import type { PendingPhoto, ApprovedPhoto } from '@/lib/photos'
import { generatePhotoSlug } from '@/lib/generatePhotoSlug'
import { REJECTION_REASONS, type RejectionReasonId } from '@/lib/rejectionReasons'

const CropModal = dynamic(() => import('@/app/upload/CropModal'), { ssr: false })

const pillPrimary = 'h-11 inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-ink-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
const pillSecondary = 'h-11 inline-flex items-center justify-center gap-2 rounded-full border border-line-strong bg-surface px-5 text-sm font-medium text-ink hover:bg-subtle transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
const iconBtn = 'w-11 h-11 shrink-0 inline-flex items-center justify-center rounded-full border border-line bg-surface text-muted hover:text-ink hover:border-line-strong transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
const monoLabel = 'font-mono text-[11px] tracking-[1px] uppercase'

const STATUS_BADGE = {
  approved: { text: 'Live', class: 'bg-surface text-ink' },
  pending: { text: 'In review', class: 'bg-ink text-white' },
  rejected: { text: 'Not approved', class: 'bg-mark text-white' },
} as const

function Spinner() {
  return <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" aria-hidden="true" />
}

function Icon({ d, className = 'w-[18px] h-[18px]' }: { d: string; className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  )
}

const ICONS = {
  close: 'M6 6l12 12M18 6L6 18',
  prev: 'M15 18l-6-6 6-6',
  next: 'M9 6l6 6-6 6',
  crop: 'M6 2v14a2 2 0 002 2h14M2 6h14a2 2 0 012 2v14',
  revert: 'M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 010 11H11',
  split: 'M6 9a3 3 0 100-6 3 3 0 000 6zm0 12a3 3 0 100-6 3 3 0 000 6zM20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12',
  trash: 'M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12M9 7V4h6v3',
  edit: 'M16.86 4.49l2.65 2.65M4 20l4.24-.94L19.5 7.8a1.87 1.87 0 00-2.65-2.65L5.6 16.4 4 20z',
  search: 'M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z',
  sparkle: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z',
} as const

/** Modal for picking a rejection reason before confirming reject */
function RejectModal({
  watchName,
  onConfirm,
  onCancel,
}: {
  watchName: string
  onConfirm: (reasonId: RejectionReasonId, note: string) => void
  onCancel: () => void
}) {
  const [selected, setSelected] = useState<RejectionReasonId>('not_original')
  const [note, setNote] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink/40">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reject-title"
        className="bg-surface rounded-t-xl sm:rounded-xl shadow-lg w-full max-w-md max-h-[92vh] flex flex-col"
      >
        <div className="px-5 pt-5 pb-4 border-b border-line flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={`${monoLabel} text-muted`}>Reject submission</p>
            <h3 id="reject-title" className="mt-1 text-lg font-semibold text-ink truncate">{watchName}</h3>
          </div>
          <button type="button" onClick={onCancel} className={`${iconBtn} -mr-1.5 -mt-1.5 border-transparent`} aria-label="Close">
            <Icon d={ICONS.close} />
          </button>
        </div>
        <div role="radiogroup" aria-labelledby="reject-reason-label" className="px-5 py-4 space-y-2 overflow-y-auto min-h-0 flex-1">
          <p id="reject-reason-label" className={`${monoLabel} text-muted mb-2`}>Reason</p>
          {REJECTION_REASONS.map((reason) => (
            <label
              key={reason.id}
              className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                selected === reason.id
                  ? 'border-ink bg-surface shadow-[inset_2px_0_0_theme(colors.mark)]'
                  : 'border-line hover:border-line-strong hover:bg-canvas'
              }`}
            >
              <input
                type="radio"
                name="reject-reason"
                value={reason.id}
                checked={selected === reason.id}
                onChange={() => setSelected(reason.id as RejectionReasonId)}
                className="mt-0.5 w-4 h-4 accent-ink shrink-0"
              />
              <div>
                <p className="text-sm font-semibold text-ink">{reason.label}</p>
                {reason.id !== 'other' && (
                  <p className="text-[13px] text-muted mt-0.5 leading-snug">{reason.description}</p>
                )}
              </div>
            </label>
          ))}
          <div className="pt-2">
            <label htmlFor="reject-note" className={`${monoLabel} text-muted block mb-1.5`}>
              {selected === 'other' ? 'Note (required)' : 'Additional note (optional)'}
            </label>
            <textarea
              id="reject-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note for the user..."
              rows={2}
              className="w-full text-sm bg-surface border border-line rounded-md px-3 py-2.5 text-ink placeholder:text-faint focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink resize-none"
            />
          </div>
        </div>
        <div className="px-5 py-4 border-t border-line flex gap-2 justify-end shrink-0">
          <button type="button" onClick={onCancel} className={pillSecondary}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (selected === 'other' && !note.trim()) return
              onConfirm(selected, note.trim())
            }}
            disabled={selected === 'other' && !note.trim()}
            className={pillPrimary}
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  )
}

type Tab = 'pending' | 'approved' | 'rejected'

type EditableFields = {
  brandName: string
  modelName: string
  referenceNumber: string
  movement: string
  caseSize: string
  wristSize: string
  estimatedPrice: string
  lugToLug: string
  betweenLugs: string
  thickness: string
  waterResistance: string
}

// Watch-level metadata (shared across all photos for same watch)
type WatchMetaFields = EditableFields

type PhotoGroup<T extends PendingPhoto | ApprovedPhoto> = {
  key: string
  watchId: string
  photos: T[]
  brandName: string
  modelName: string
  referenceNumber: string
  submitterName: string
  submittedDate: string
}

type LightboxState = {
  isOpen: boolean
  currentIndex: number
  watchId: string
}



/** Extract the real watchId from a group key like "omega-seamaster::user_abc" */
function watchIdFromKey(groupKey: string): string {
  return groupKey.split('::')[0]
}

function photoToWatchMeta(photo: PendingPhoto | ApprovedPhoto): WatchMetaFields {
  return {
    brandName: photo.brandName ?? '',
    modelName: photo.modelName ?? '',
    referenceNumber: photo.referenceNumber ?? '',
    movement: photo.movement ?? '',
    caseSize: photo.caseSize ?? '',
    wristSize: photo.wristSize ?? '',
    estimatedPrice: photo.estimatedPrice ?? '',
    lugToLug: photo.lugToLug ?? '',
    betweenLugs: photo.betweenLugs ?? '',
    thickness: photo.thickness ?? '',
    waterResistance: photo.waterResistance ?? '',
  }
}

/**
 * Group photos by watchId + userId (= one submission). Each group takes metadata from the first photo.
 * Photos are ordered newest first within each group.
 */
function groupPhotosByWatch<T extends PendingPhoto | ApprovedPhoto>(photos: T[]): PhotoGroup<T>[] {
  const grouped = new Map<string, PhotoGroup<T>>()

  photos.forEach((photo) => {
    const key = `${photo.watchId}::${photo.userId}`
    if (!grouped.has(key)) {
      grouped.set(key, {
        key,
        watchId: photo.watchId,
        photos: [],
        brandName: photo.brandName ?? '',
        modelName: photo.modelName ?? '',
        referenceNumber: photo.referenceNumber ?? '',
        submitterName: photo.userName,
        submittedDate: photo.createdAt,
      })
    }
    grouped.get(key)!.photos.push(photo)
  })

  // Sort each group's photos by sortOrder asc, then createdAt asc (upload order)
  grouped.forEach((group) => {
    group.photos.sort((a, b) => {
      const orderDiff = (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
      if (orderDiff !== 0) return orderDiff
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })
  })

  // Return groups sorted by most recent photo in each group
  return Array.from(grouped.values()).sort((a, b) => {
    const aDate = new Date(a.photos[0]!.createdAt).getTime()
    const bDate = new Date(b.photos[0]!.createdAt).getTime()
    return bDate - aDate
  })
}

function FieldInput({
  label,
  value,
  onChange,
  unit,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  unit?: string
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <label htmlFor={id} className="font-mono text-[10.5px] tracking-[0.8px] uppercase text-muted">
        {label}{unit && <span className="normal-case tracking-normal"> · {unit}</span>}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 text-sm bg-surface border border-line rounded-md px-3 text-ink placeholder:text-faint focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink"
        placeholder="—"
      />
    </div>
  )
}

/**
 * Lightbox modal component for viewing full-size photo with navigation
 */
function PhotoLightbox({
  isOpen,
  photos,
  currentIndex,
  onClose,
  onNext,
  onPrev,
}: {
  isOpen: boolean
  photos: (PendingPhoto | ApprovedPhoto)[]
  currentIndex: number
  onClose: () => void
  onNext: () => void
  onPrev: () => void
}) {
  if (!isOpen || photos.length === 0) return null

  const photo = photos[currentIndex]
  if (!photo) return null

  const navBtn = 'absolute top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center bg-white/10 text-white hover:bg-white/20 transition-colors'

  return (
    <div className="fixed inset-0 z-50 bg-ink/90 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Photo viewer">
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 w-11 h-11 rounded-full flex items-center justify-center bg-white/10 text-white hover:bg-white/20 transition-colors z-10"
        aria-label="Close lightbox"
      >
        <Icon d={ICONS.close} className="w-5 h-5" />
      </button>

      {photos.length > 1 && (
        <button type="button" onClick={onPrev} className={`${navBtn} left-4`} aria-label="Previous photo">
          <Icon d={ICONS.prev} className="w-5 h-5" />
        </button>
      )}

      <div className="flex flex-col items-center gap-3 max-w-3xl max-h-[90vh]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.url}
          alt="Full size"
          className="max-w-full max-h-[80vh] object-contain rounded-md"
        />
        {photos.length > 1 && (
          <p className="font-mono text-xs tracking-[1px] text-white/80">
            {String(currentIndex + 1).padStart(2, '0')} / {String(photos.length).padStart(2, '0')}
          </p>
        )}
      </div>

      {photos.length > 1 && (
        <button type="button" onClick={onNext} className={`${navBtn} right-4`} aria-label="Next photo">
          <Icon d={ICONS.next} className="w-5 h-5" />
        </button>
      )}
    </div>
  )
}

/**
 * GroupedPhotoCard: Displays a group of photos for the same watch.
 * - Watch metadata shown ONCE at the group level
 * - Compact thumbnail grid (3-4 per row)
 * - Single "Approve Watch" button for entire group (pending tab)
 * - Individual delete buttons per photo (approved tab)
 * - Lightbox modal for viewing full-size photos with gallery nav
 */
function GroupedPhotoCard<T extends PendingPhoto | ApprovedPhoto>({
  group,
  watchMeta,
  acting,
  aiFillingGroup,
  aiFilledGroupOk,
  onUpdateWatchMeta,
  onAiFillGroup,
  onSaveMetadata,
  isDirty,
  isSavingMeta,
  savedMetaOk,
  onRestoreGroup,
  onDeleteGroup,
  onDelete,
  onSplitPhoto,
  splittingPhotoId,
  onCropPhoto,
  onRevertCrop,
  croppingPhotoId,
  onReorder,
  onApproveGroup,
  isApprovingGroup,
  onRejectGroup,
  isApproved,
  isRejected,
  selectedPhotoIds,
  onTogglePhoto,
  onToggleGroup,
}: {
  group: PhotoGroup<T>
  watchMeta: WatchMetaFields
  acting: string | null
  aiFillingGroup: string | null
  aiFilledGroupOk: string | null
  onUpdateWatchMeta: (watchId: string, field: keyof WatchMetaFields, value: string) => void
  onAiFillGroup: (watchId: string, imageUrls: string[]) => void
  onSaveMetadata?: (watchId: string, photoIds: string[]) => void
  isDirty?: boolean
  isSavingMeta?: boolean
  savedMetaOk?: boolean
  onRestoreGroup?: (watchId: string, photoIds: string[]) => void
  onDeleteGroup?: (watchId: string, photoIds: string[]) => void
  onDelete?: (photo: T) => void
  onSplitPhoto?: (photo: T) => void
  selectedPhotoIds?: Set<string>
  onTogglePhoto?: (photoId: string) => void
  onToggleGroup?: (photoIds: string[], allSelected: boolean) => void
  splittingPhotoId?: string | null
  onCropPhoto?: (photo: T) => void
  onRevertCrop?: (photo: T) => void
  croppingPhotoId?: string | null
  onReorder?: (watchId: string, reorderedPhotos: (PendingPhoto | ApprovedPhoto)[]) => void
  onApproveGroup?: (photoIds: string[]) => void
  isApprovingGroup?: boolean
  onRejectGroup?: (photoIds: string[], watchName: string) => void
  isApproved: boolean
  isRejected?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const [lightbox, setLightbox] = useState<LightboxState>({
    isOpen: false,
    currentIndex: 0,
    watchId: group.watchId,
  })
  const [pointerDrag, setPointerDrag] = useState<{
    index: number; ghostX: number; ghostY: number
    offsetX: number; offsetY: number; cardW: number; cardH: number
  } | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const gridRef = useRef<HTMLDivElement>(null)
  const [pendingReorder, setPendingReorder] = useState<(PendingPhoto | ApprovedPhoto)[] | null>(null)
  const [savingReorder, setSavingReorder] = useState(false)
  const [reorderSavedOk, setReorderSavedOk] = useState(false)

  const displayName = [watchMeta.brandName, watchMeta.modelName].filter(Boolean).join(' ') || group.watchId
  const isAiFillingGroup = aiFillingGroup === group.key
  const groupAiFilledOk = aiFilledGroupOk === group.key
  const isRestoringGroup = acting === `restore-${group.key}`
  const isPending = !isApproved && !isRejected

  const groupPhotoIds = group.photos.map((p) => p.id)
  const selectedInGroup = selectedPhotoIds ? groupPhotoIds.filter((id) => selectedPhotoIds.has(id)) : []
  const allGroupSelected = selectedInGroup.length === groupPhotoIds.length
  const someGroupSelected = selectedInGroup.length > 0 && !allGroupSelected

  const openLightbox = useCallback((index: number) => {
    setLightbox({ isOpen: true, currentIndex: index, watchId: group.watchId })
  }, [group.watchId])

  const closeLightbox = useCallback(() => {
    setLightbox((prev) => ({ ...prev, isOpen: false }))
  }, [])

  const goNext = useCallback(() => {
    setLightbox((prev) => ({
      ...prev,
      currentIndex: (prev.currentIndex + 1) % group.photos.length,
    }))
  }, [group.photos.length])

  const goPrev = useCallback(() => {
    setLightbox((prev) => ({
      ...prev,
      currentIndex:
        prev.currentIndex === 0 ? group.photos.length - 1 : prev.currentIndex - 1,
    }))
  }, [group.photos.length])

  // Pointer-based drag: move ghost + find drop target
  useEffect(() => {
    if (!pointerDrag) return

    const handleMove = (e: PointerEvent) => {
      setPointerDrag((prev) => prev ? { ...prev, ghostX: e.clientX, ghostY: e.clientY } : null)
      for (let i = 0; i < cardRefs.current.length; i++) {
        const el = cardRefs.current[i]
        if (!el) continue
        const r = el.getBoundingClientRect()
        if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
          setDropIndex(i)
          break
        }
      }
    }

    const handleUp = () => {
      setPointerDrag((prev) => {
        if (prev && dropIndex !== null && dropIndex !== prev.index) {
          const source = pendingReorder ?? group.photos
          const reordered = [...source]
          const [moved] = reordered.splice(prev.index, 1)
          reordered.splice(dropIndex, 0, moved)
          setPendingReorder(reordered)
          setReorderSavedOk(false)
        }
        return null
      })
      setDropIndex(null)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
  }, [pointerDrag, dropIndex, group.photos, pendingReorder, group.key, onReorder])

  const status = isApproved ? 'approved' : isRejected ? 'rejected' : 'pending'
  const badge = STATUS_BADGE[status]
  const totalLikes = group.photos.reduce((s, p) => s + (p.likeCount ?? 0), 0)
  const totalSaves = group.photos.reduce((s, p) => s + (p.saveCount ?? 0), 0)
  const submittedLabel = new Date(group.submittedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const photoCountLabel = `${group.photos.length} photo${group.photos.length !== 1 ? 's' : ''}`
  const isDeletingGroup = acting === `delete-group-${group.key}`
  const isRejectingGroup = acting === `reject-${group.key}`
  const rejectionReason = isRejected ? (group.photos[0] as PendingPhoto | undefined)?.rejectionReason : null

  const groupCheckbox = isPending && onToggleGroup && (
    <label
      className="w-11 h-11 shrink-0 flex items-center justify-center cursor-pointer"
      onClick={(e) => e.stopPropagation()}
    >
      <input
        type="checkbox"
        checked={allGroupSelected}
        ref={(el) => { if (el) el.indeterminate = someGroupSelected }}
        onChange={() => onToggleGroup(groupPhotoIds, allGroupSelected)}
        className="w-[18px] h-[18px] accent-ink cursor-pointer"
        aria-label={`Select all photos of ${displayName}`}
      />
    </label>
  )

  const titleBlock = (
    <div className="min-w-0">
      {watchMeta.brandName && (
        <p className={`${monoLabel} text-muted truncate`}>{watchMeta.brandName}</p>
      )}
      <h3 className={`${watchMeta.brandName ? 'mt-[3px]' : ''} text-base leading-snug font-semibold text-ink`}>
        {watchMeta.modelName || (watchMeta.brandName ? '' : displayName) || 'New watch'}
      </h3>
      {watchMeta.referenceNumber && (
        <p className="mt-0.5 font-mono text-xs text-muted truncate">Ref. {watchMeta.referenceNumber}</p>
      )}
      <p className="mt-1 font-mono text-[11px] text-muted truncate">
        {group.submitterName} · {submittedLabel}
      </p>
      {isDirty && (
        <p className={`mt-1 ${monoLabel} text-[10.5px] text-mark`}>Unsaved changes</p>
      )}
    </div>
  )

  return (
    <>
      {!expanded ? (
        /* ── Collapsed tile — 4:5 cover ── */
        <article className={`min-w-0 ${isDeletingGroup || isRejectingGroup ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className={`relative rounded-md ${allGroupSelected && isPending && onToggleGroup ? 'ring-2 ring-mark ring-offset-2 ring-offset-canvas' : ''}`}>
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="block w-full relative aspect-[4/5] overflow-hidden rounded-md bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-4 focus-visible:ring-offset-canvas"
              aria-label={`Open details for ${displayName}`}
            >
              {group.photos[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={group.photos[0].url} alt="" className="w-full h-full object-cover" />
              )}
            </button>
            <span className={`pointer-events-none absolute left-2.5 top-2.5 h-[26px] rounded-full flex items-center px-2.5 font-mono text-[10.5px] tracking-[0.8px] uppercase ${badge.class}`}>
              {badge.text}
            </span>
            {groupCheckbox && (
              <div className="absolute right-0 top-0">
                <span className="absolute inset-[11px] rounded-[5px] bg-surface/90 pointer-events-none" aria-hidden="true" />
                <div className="relative">{groupCheckbox}</div>
              </div>
            )}
            <div className="pointer-events-none absolute left-2.5 bottom-2.5 right-2.5 flex items-center gap-1.5">
              {group.photos.length > 1 && (
                <span className="h-6 rounded-full flex items-center px-2 bg-ink/70 text-white font-mono text-[10.5px] tracking-[0.5px]">
                  {photoCountLabel}
                </span>
              )}
              {isApproved && totalLikes > 0 && (
                <span className="h-6 rounded-full flex items-center gap-1 px-2 bg-ink/70 text-white font-mono text-[10.5px]">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
                  {totalLikes}<span className="sr-only"> likes</span>
                </span>
              )}
              {isApproved && totalSaves > 0 && (
                <span className="h-6 rounded-full flex items-center gap-1 px-2 bg-ink/70 text-white font-mono text-[10.5px]">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" /></svg>
                  {totalSaves}<span className="sr-only"> saves</span>
                </span>
              )}
            </div>
          </div>

          <div className="mt-2.5 flex items-start justify-between gap-2">
            {titleBlock}
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="w-11 h-11 shrink-0 -mr-2 -mt-1.5 flex items-center justify-center rounded-full text-muted hover:text-ink hover:bg-subtle transition-colors"
              aria-label={`Edit, crop or reorder ${displayName}`}
            >
              <Icon d={ICONS.edit} />
            </button>
          </div>

          {rejectionReason && (
            <div className="mt-2 border-l-2 border-mark pl-2.5">
              <p className="font-mono text-[10.5px] tracking-[0.8px] uppercase text-mark">Reason</p>
              <p className="mt-0.5 text-[13px] leading-snug text-muted line-clamp-2">{rejectionReason}</p>
            </div>
          )}

          <div className="mt-3 flex gap-2">
            {isPending && onApproveGroup && (
              <button
                type="button"
                onClick={() => onApproveGroup(groupPhotoIds)}
                disabled={isApprovingGroup}
                className={`${pillPrimary} flex-1 min-w-0 px-3`}
              >
                {isApprovingGroup ? <><Spinner /> Approving</> : 'Approve'}
              </button>
            )}
            {isPending && onRejectGroup && (
              <button
                type="button"
                onClick={() => onRejectGroup(groupPhotoIds, displayName)}
                disabled={isRejectingGroup}
                className={`${pillSecondary} flex-1 min-w-0 px-3`}
              >
                Reject
              </button>
            )}
            {isApproved && (
              <button type="button" onClick={() => setExpanded(true)} className={`${pillSecondary} flex-1 min-w-0 px-3`}>
                {savedMetaOk ? 'Saved' : 'Edit details'}
              </button>
            )}
            {isRejected && onRestoreGroup && (
              <button
                type="button"
                onClick={() => onRestoreGroup(group.key, groupPhotoIds)}
                disabled={isRestoringGroup}
                className={`${pillPrimary} flex-1 min-w-0 px-3`}
              >
                {isRestoringGroup ? <><Spinner /> Restoring</> : 'Restore'}
              </button>
            )}
            {isRejected && onDeleteGroup && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Permanently delete all ${group.photos.length} photo${group.photos.length > 1 ? 's' : ''} for ${displayName}? This cannot be undone.`))
                    onDeleteGroup(group.key, groupPhotoIds)
                }}
                disabled={isDeletingGroup}
                className={`${pillSecondary} flex-1 min-w-0 px-3`}
              >
                {isDeletingGroup ? 'Deleting' : 'Delete'}
              </button>
            )}
          </div>
        </article>
      ) : (
        /* ── Expanded panel — spans the full grid row ── */
        <section className="col-span-full min-w-0 rounded-[10px] border border-line bg-surface" aria-label={displayName}>
          {/* Header */}
          <div className="px-4 sm:px-5 py-4 flex items-start gap-2 sm:gap-3 border-b border-line">
            {groupCheckbox && <div className="-ml-2.5 -mt-1">{groupCheckbox}</div>}
            <div className="flex-1 min-w-0">
              <span className={`inline-flex h-[26px] rounded-full items-center px-2.5 font-mono text-[10.5px] tracking-[0.8px] uppercase mb-2 ${status === 'approved' ? 'border border-line text-ink' : badge.class}`}>
                {badge.text}
              </span>
              {titleBlock}
            </div>
            <p className="hidden sm:block font-mono text-[11px] text-muted pt-1.5 shrink-0">{photoCountLabel}</p>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className={`${iconBtn} -mr-1.5 -mt-1.5 border-transparent`}
              aria-label="Close details"
            >
              <Icon d={ICONS.close} />
            </button>
          </div>

          <div className="grid lg:grid-cols-[minmax(0,1fr)_340px]">
            {/* Photos */}
            <div className="px-4 sm:px-5 py-4 min-w-0 border-b lg:border-b-0 lg:border-r border-line">
              <div className="flex items-baseline justify-between gap-3 mb-3">
                <p className={`${monoLabel} text-muted`}>Photos</p>
                {!isRejected && group.photos.length > 1 && (
                  <p className="font-mono text-[11px] text-muted">Drag to reorder</p>
                )}
              </div>
              <div ref={gridRef} className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-4">
                {(pendingReorder ?? group.photos as (PendingPhoto | ApprovedPhoto)[]).map((photo, idx) => {
                  const isActing = acting === photo.id
                  const isLastPhoto = group.photos.length === 1
                  const canDelete = isRejected || isPending ? true : !isLastPhoto

                  const canDrag = !isRejected && !isLastPhoto
                  const isDragging = pointerDrag?.index === idx
                  const isDropTarget = dropIndex === idx && pointerDrag !== null && dropIndex !== pointerDrag.index
                  const isSelected = selectedPhotoIds?.has(photo.id) ?? false

                  const handlePointerDown = (e: React.PointerEvent) => {
                    if (!canDrag) return
                    // Only main button (left click / touch)
                    if (e.button !== 0 && e.pointerType === 'mouse') return
                    e.preventDefault()
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                    setPointerDrag({
                      index: idx,
                      ghostX: e.clientX,
                      ghostY: e.clientY,
                      offsetX: e.clientX - rect.left,
                      offsetY: e.clientY - rect.top,
                      cardW: rect.width,
                      cardH: rect.height,
                    })
                    setDropIndex(idx)
                  }

                  return (
                    <div key={photo.id} ref={(el) => { cardRefs.current[idx] = el }} className="min-w-0">
                      <div
                        onPointerDown={handlePointerDown}
                        className={`relative aspect-[4/5] rounded-md overflow-hidden bg-subtle select-none touch-none transition-all ${
                          isDragging
                            ? 'opacity-30 outline-dashed outline-2 outline-line-strong'
                            : isDropTarget
                              ? 'ring-2 ring-mark ring-offset-2 ring-offset-surface scale-[1.03] shadow-md'
                              : isSelected
                                ? 'ring-2 ring-mark ring-offset-2 ring-offset-surface'
                                : canDrag
                                  ? 'cursor-grab hover:ring-1 hover:ring-line-strong'
                                  : ''
                        }`}
                      >
                        <button
                          type="button"
                          onClick={(e) => { if (pointerDrag) { e.preventDefault(); return }; openLightbox(idx) }}
                          className="w-full h-full"
                          aria-label={`View photo ${idx + 1}`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={photo.url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                        </button>

                        {/* Position badge */}
                        {canDrag && (
                          <span className="pointer-events-none absolute bottom-2 left-2 h-6 rounded-full flex items-center px-2 bg-ink/70 text-white font-mono text-[10.5px] tracking-[0.5px]">
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                        )}
                        {photo.originalUrl && (
                          <span className="pointer-events-none absolute top-2 left-2 h-6 rounded-full flex items-center px-2 bg-surface text-ink font-mono text-[10.5px] tracking-[0.5px] uppercase">
                            Cropped
                          </span>
                        )}

                        {/* Per-photo select checkbox (pending only) */}
                        {isPending && onTogglePhoto && (
                          <label
                            className="absolute top-0 right-0 w-11 h-11 flex items-center justify-center cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                          >
                            <span className="absolute inset-[11px] rounded-[5px] bg-surface/90 pointer-events-none" aria-hidden="true" />
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => onTogglePhoto(photo.id)}
                              className="relative w-[18px] h-[18px] accent-ink cursor-pointer"
                              aria-label={`Select photo ${idx + 1}`}
                            />
                          </label>
                        )}
                      </div>

                      {/* Per-photo tools */}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {onCropPhoto && (
                          <button
                            type="button"
                            onClick={() => onCropPhoto(photo as T)}
                            disabled={croppingPhotoId === photo.id}
                            className={iconBtn}
                            title="Crop photo"
                            aria-label={`Crop photo ${idx + 1}`}
                          >
                            {croppingPhotoId === photo.id ? <Spinner /> : <Icon d={ICONS.crop} />}
                          </button>
                        )}
                        {onCropPhoto && onRevertCrop && photo.originalUrl && (
                          <button
                            type="button"
                            onClick={() => onRevertCrop(photo as T)}
                            disabled={croppingPhotoId === photo.id}
                            className={iconBtn}
                            title="Revert to original (undo crop)"
                            aria-label={`Revert photo ${idx + 1} to original`}
                          >
                            <Icon d={ICONS.revert} />
                          </button>
                        )}
                        {/* Split — re-identify and move to its own group */}
                        {onSplitPhoto && !isLastPhoto && isPending && (
                          <button
                            type="button"
                            onClick={() => onSplitPhoto(photo as T)}
                            disabled={splittingPhotoId === photo.id}
                            className={iconBtn}
                            title="Split: re-identify this photo as a separate watch"
                            aria-label={`Split photo ${idx + 1} to a new watch`}
                          >
                            {splittingPhotoId === photo.id ? <Spinner /> : <Icon d={ICONS.split} />}
                          </button>
                        )}
                        {onDelete && (
                          <button
                            type="button"
                            onClick={() => onDelete(photo as T)}
                            disabled={isActing || !canDelete}
                            className={`${iconBtn} hover:!text-mark`}
                            title={isLastPhoto && !isRejected && !isPending ? 'Cannot delete the last photo' : 'Delete photo'}
                            aria-label={`Delete photo ${idx + 1}`}
                          >
                            {isActing ? <Spinner /> : <Icon d={ICONS.trash} />}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Pending reorder save bar */}
              {pendingReorder && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      setSavingReorder(true)
                      await onReorder?.(group.key, pendingReorder)
                      setSavingReorder(false)
                      setReorderSavedOk(true)
                      setPendingReorder(null)
                      setTimeout(() => setReorderSavedOk(false), 2000)
                    }}
                    disabled={savingReorder}
                    className={pillPrimary}
                  >
                    {savingReorder ? <><Spinner /> Saving</> : 'Save order'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingReorder(null)}
                    disabled={savingReorder}
                    className={pillSecondary}
                  >
                    Discard
                  </button>
                </div>
              )}
              {reorderSavedOk && (
                <p className={`mt-3 ${monoLabel} text-winner`}>Order saved</p>
              )}
            </div>

            {/* Watch metadata */}
            <div className="px-4 sm:px-5 py-4 min-w-0">
              <p className={`${monoLabel} text-muted mb-3`}>Watch info</p>
              <div className="grid grid-cols-2 gap-x-2.5 gap-y-3">
                <FieldInput label="Brand" value={watchMeta.brandName} onChange={(v) => onUpdateWatchMeta(group.key, 'brandName', v)} />
                <FieldInput label="Model" value={watchMeta.modelName} onChange={(v) => onUpdateWatchMeta(group.key, 'modelName', v)} />
                <FieldInput label="Ref #" value={watchMeta.referenceNumber} onChange={(v) => onUpdateWatchMeta(group.key, 'referenceNumber', v)} />
                <FieldInput label="Movement" value={watchMeta.movement} onChange={(v) => onUpdateWatchMeta(group.key, 'movement', v)} />
                <FieldInput label="Case" value={watchMeta.caseSize} onChange={(v) => onUpdateWatchMeta(group.key, 'caseSize', v)} unit="mm" />
                <FieldInput label="Wrist" value={watchMeta.wristSize} onChange={(v) => onUpdateWatchMeta(group.key, 'wristSize', v)} unit="mm" />
                <FieldInput label="Price" value={watchMeta.estimatedPrice} onChange={(v) => onUpdateWatchMeta(group.key, 'estimatedPrice', v)} unit="USD" />
                <FieldInput label="L-L" value={watchMeta.lugToLug} onChange={(v) => onUpdateWatchMeta(group.key, 'lugToLug', v)} unit="mm" />
                <FieldInput label="B.L." value={watchMeta.betweenLugs} onChange={(v) => onUpdateWatchMeta(group.key, 'betweenLugs', v)} unit="mm" />
                <FieldInput label="Thick" value={watchMeta.thickness} onChange={(v) => onUpdateWatchMeta(group.key, 'thickness', v)} unit="mm" />
                <FieldInput label="WR" value={watchMeta.waterResistance} onChange={(v) => onUpdateWatchMeta(group.key, 'waterResistance', v)} unit="m" />
              </div>
              <div className="flex items-center gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => onAiFillGroup(group.key, group.photos.map((p) => p.url))}
                  disabled={isAiFillingGroup}
                  className={pillSecondary}
                >
                  {isAiFillingGroup ? <><Spinner /> Filling</> : <><Icon d={ICONS.sparkle} className="w-4 h-4" /> AI fill</>}
                </button>
                {groupAiFilledOk && <span className={`${monoLabel} text-winner`}>Filled</span>}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="px-4 sm:px-5 py-4 border-t border-line flex flex-wrap items-center gap-2">
            {isPending && onApproveGroup && (
              <button
                type="button"
                onClick={() => onApproveGroup(groupPhotoIds)}
                disabled={isApprovingGroup}
                className={pillPrimary}
              >
                {isApprovingGroup ? <><Spinner /> Approving</> : `Approve ${photoCountLabel}`}
              </button>
            )}
            {isPending && onRejectGroup && (
              <button
                type="button"
                onClick={() => onRejectGroup(groupPhotoIds, displayName)}
                disabled={isRejectingGroup}
                className={pillSecondary}
              >
                Reject
              </button>
            )}
            {!isRejected && isDirty && onSaveMetadata && (
              <button
                type="button"
                onClick={() => onSaveMetadata(group.key, groupPhotoIds)}
                disabled={isSavingMeta}
                className={isApproved ? pillPrimary : pillSecondary}
              >
                {isSavingMeta ? <><Spinner /> Saving</> : isApproved ? 'Save changes' : 'Save metadata'}
              </button>
            )}
            {isRejected && onRestoreGroup && (
              <button
                type="button"
                onClick={() => onRestoreGroup(group.key, groupPhotoIds)}
                disabled={isRestoringGroup}
                className={pillPrimary}
              >
                {isRestoringGroup ? <><Spinner /> Restoring</> : 'Restore to pending'}
              </button>
            )}
            {isRejected && onDeleteGroup && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Permanently delete all ${group.photos.length} photo${group.photos.length > 1 ? 's' : ''} for ${displayName}? This cannot be undone.`))
                    onDeleteGroup(group.key, groupPhotoIds)
                }}
                disabled={isDeletingGroup}
                className={`${pillSecondary} !text-mark`}
              >
                {isDeletingGroup ? <><Spinner /> Deleting</> : 'Delete all'}
              </button>
            )}
            {savedMetaOk && <span className={`${monoLabel} text-winner`}>Saved</span>}
            {isApproved && !isDirty && !savedMetaOk && (
              <span className={`${monoLabel} text-muted`}>Live in gallery</span>
            )}
          </div>
        </section>
      )}

      {/* Lightbox modal */}
      <PhotoLightbox
        isOpen={lightbox.isOpen && lightbox.watchId === group.watchId}
        photos={group.photos}
        currentIndex={lightbox.currentIndex}
        onClose={closeLightbox}
        onNext={goNext}
        onPrev={goPrev}
      />

      {/* Floating ghost — follows cursor while dragging */}
      {pointerDrag && (() => {
        const dragPhotos = pendingReorder ?? group.photos
        const photo = dragPhotos[pointerDrag.index]
        if (!photo) return null
        return (
          <div
            style={{
              position: 'fixed',
              left: pointerDrag.ghostX - pointerDrag.offsetX,
              top: pointerDrag.ghostY - pointerDrag.offsetY,
              width: pointerDrag.cardW,
              height: pointerDrag.cardH,
              zIndex: 1000,
              pointerEvents: 'none',
              transform: 'rotate(3deg) scale(1.08)',
              boxShadow: '0 24px 48px rgba(0,0,0,0.35)',
              borderRadius: '8px',
              overflow: 'hidden',
              cursor: 'grabbing',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', inset: 0, border: '2px solid #C2410C', borderRadius: '8px' }} />
          </div>
        )
      })()}
    </>
  )
}

export default function AdminPhotosClient() {
  const [activeTab, setActiveTab] = useState<Tab>('pending')
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([])
  const [approvedPhotos, setApprovedPhotos] = useState<ApprovedPhoto[]>([])
  const [rejectedPhotos, setRejectedPhotos] = useState<PendingPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [acting, setActing] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [rejectModal, setRejectModal] = useState<{ groupKey: string; watchName: string; photoIds: string[] } | null>(null)
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set())

  // Group-level watch metadata state (keyed by watchId)
  const [watchMetaState, setWatchMetaState] = useState<Record<string, WatchMetaFields>>({})

  // AI Fill state
  const [aiFillingGroup, setAiFillingGroup] = useState<string | null>(null)
  const [aiFilledGroupOk, setAiFilledGroupOk] = useState<string | null>(null)

  // Split photo state
  const [splittingPhotoId, setSplittingPhotoId] = useState<string | null>(null)

  // Crop state
  const [cropTarget, setCropTarget] = useState<{ photoId: string; imageUrl: string } | null>(null)
  const [croppingPhotoId, setCroppingPhotoId] = useState<string | null>(null)

  // Metadata save state (approved tab)
  const [dirtyGroups, setDirtyGroups] = useState<Set<string>>(new Set())
  const [savingMetaGroup, setSavingMetaGroup] = useState<string | null>(null)
  const [savedMetaGroupOk, setSavedMetaGroupOk] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const showToast = useCallback((message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 2500)
  }, [])

  // Grouped photos for display
  const pendingGroups = useMemo(() => groupPhotosByWatch(pendingPhotos), [pendingPhotos])
  const approvedGroups = useMemo(() => groupPhotosByWatch(approvedPhotos), [approvedPhotos])
  const rejectedGroups = useMemo(() => groupPhotosByWatch(rejectedPhotos), [rejectedPhotos])

  // Filter groups by search query
  const filteredPendingGroups = useMemo(() => {
    if (!searchQuery.trim()) return pendingGroups
    const query = searchQuery.toLowerCase()
    return pendingGroups.filter((group) => {
      return group.brandName.toLowerCase().includes(query) ||
        group.modelName.toLowerCase().includes(query) ||
        group.referenceNumber.toLowerCase().includes(query)
    })
  }, [pendingGroups, searchQuery])

  const filteredApprovedGroups = useMemo(() => {
    if (!searchQuery.trim()) return approvedGroups
    const query = searchQuery.toLowerCase()
    return approvedGroups.filter((group) => {
      return group.brandName.toLowerCase().includes(query) ||
        group.modelName.toLowerCase().includes(query) ||
        group.referenceNumber.toLowerCase().includes(query)
    })
  }, [approvedGroups, searchQuery])

  const filteredRejectedGroups = useMemo(() => {
    if (!searchQuery.trim()) return rejectedGroups
    const query = searchQuery.toLowerCase()
    return rejectedGroups.filter((group) => {
      return group.brandName.toLowerCase().includes(query) ||
        group.modelName.toLowerCase().includes(query) ||
        group.referenceNumber.toLowerCase().includes(query)
    })
  }, [rejectedGroups, searchQuery])

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
          fetch('/api/admin/photos'),
          fetch('/api/admin/photos?status=approved'),
          fetch('/api/admin/photos?status=rejected'),
        ])

        if (!pendingRes.ok || !approvedRes.ok || !rejectedRes.ok) {
          if (pendingRes.status === 401 || pendingRes.status === 403) {
            throw new Error('Access denied — admin only')
          }
          throw new Error('Failed to fetch photos')
        }

        const pendingData = (await pendingRes.json()) as PendingPhoto[]
        const approvedData = (await approvedRes.json()) as ApprovedPhoto[]
        const rejectedData = (await rejectedRes.json()) as PendingPhoto[]

        if (Array.isArray(pendingData)) {
          setPendingPhotos(pendingData)
          initializeState(pendingData)
        }

        if (Array.isArray(approvedData)) {
          setApprovedPhotos(approvedData)
          initializeState(approvedData)
        }

        if (Array.isArray(rejectedData)) {
          setRejectedPhotos(rejectedData)
          initializeState(rejectedData)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchPhotos()
  }, [])

  function initializeState(photos: (PendingPhoto | ApprovedPhoto)[]) {
    // Group by watchId::userId (submission) — take metadata from the first photo per group
    const metaByGroup: Record<string, WatchMetaFields> = {}

    photos.forEach((photo) => {
      const key = `${photo.watchId}::${photo.userId}`
      if (!metaByGroup[key]) {
        metaByGroup[key] = photoToWatchMeta(photo)
      }
    })

    setWatchMetaState((prev) => ({ ...prev, ...metaByGroup }))
  }

  function updateWatchMeta(groupKey: string, field: keyof WatchMetaFields, value: string) {
    setWatchMetaState((prev) => ({
      ...prev,
      [groupKey]: { ...prev[groupKey], [field]: value },
    }))
    setDirtyGroups((prev) => new Set(prev).add(groupKey))
  }

  async function handleSaveMetadata(groupKey: string, photoIds: string[]) {
    const meta = watchMetaState[groupKey]
    if (!meta) return
    setSavingMetaGroup(groupKey)
    try {
      const results = await Promise.all(
        photoIds.map((photoId) =>
          fetch('/api/admin/photos', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ photoId, fields: { ...meta } }),
          })
        )
      )
      if (results.every((r) => r.ok)) {
        setDirtyGroups((prev) => { const next = new Set(prev); next.delete(groupKey); return next })
        // Update local approved photos state so gallery reflects new meta immediately
        setApprovedPhotos((prev) =>
          prev.map((p) => (photoIds.includes(p.id) ? { ...p, ...meta } : p))
        )
        setSavedMetaGroupOk(groupKey)
        setTimeout(() => setSavedMetaGroupOk(null), 2500)
      } else {
        alert('Save failed — one or more photos could not be updated.')
      }
    } catch (err) {
      alert(`Save failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
    setSavingMetaGroup(null)
  }

  async function handleAiFillGroup(groupKey: string, imageUrls: string[]) {
    const meta = watchMetaState[groupKey]
    if (!meta) return

    setAiFillingGroup(groupKey)
    setAiFilledGroupOk(null)

    try {
      const response = await fetch('/api/admin/ai-fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName: meta.brandName,
          modelName: meta.modelName,
          referenceNumber: meta.referenceNumber,
          imageUrls,
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({})) as { error?: string }
        throw new Error(err.error || 'Failed to fetch AI suggestions')
      }

      const aiSuggestions = (await response.json()) as Record<string, string>

      // Update watchMeta — only fill empty fields
      setWatchMetaState((prev) => {
        const current = prev[groupKey] ?? {}
        const fill = (key: keyof typeof current) =>
          (current[key] as string)?.trim() ? current[key] : aiSuggestions[key] || ''
        return {
          ...prev,
          [groupKey]: {
            ...current,
            movement: fill('movement'),
            caseSize: fill('caseSize'),
            lugToLug: fill('lugToLug'),
            betweenLugs: fill('betweenLugs'),
            thickness: fill('thickness'),
            waterResistance: fill('waterResistance'),
            estimatedPrice: fill('estimatedPrice'),
            wristSize: fill('wristSize'),
          },
        }
      })

      setDirtyGroups((prev) => new Set(prev).add(groupKey))
      setAiFilledGroupOk(groupKey)
      setTimeout(() => setAiFilledGroupOk(null), 2500)
    } catch (err) {
      console.error('AI fill failed:', err)
      alert(`AI fill failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }

    setAiFillingGroup(null)
  }

  /**
   * Approve entire watch group — all photos and metadata approved at once
   */
  async function handleReorder(
    groupKey: string,
    reorderedPhotos: (PendingPhoto | ApprovedPhoto)[]
  ) {
    const watchId = watchIdFromKey(groupKey)
    // reorderedPhotos is already in the new order from drag-and-drop
    setActing(`reorder-${groupKey}`)
    try {
      const res = await fetch('/api/admin/photos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ watchId, photoIds: reorderedPhotos.map((p) => p.id) }),
      })
      if (res.ok) {
        setApprovedPhotos((prev) =>
          prev.map((p) => ({
            ...p,
            sortOrder: reorderedPhotos.findIndex((rp) => rp.id === p.id),
          }))
        )
        showToast('Order saved')
      }
    } catch { /* ignore */ }
    setActing(null)
  }

  async function handleReorderPending(
    groupKey: string,
    reorderedPhotos: (PendingPhoto | ApprovedPhoto)[]
  ) {
    const watchId = watchIdFromKey(groupKey)
    setActing(`reorder-${groupKey}`)
    try {
      const res = await fetch('/api/admin/photos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ watchId, photoIds: reorderedPhotos.map((p) => p.id) }),
      })
      if (res.ok) {
        // Reorder pending photos in local state to reflect drag order
        setPendingPhotos((prev) => {
          const reorderedIds = reorderedPhotos.map((p) => p.id)
          const groupPhotos = prev.filter((p) => reorderedIds.includes(p.id))
          const otherPhotos = prev.filter((p) => !reorderedIds.includes(p.id))
          const sorted = reorderedIds.map((id) => groupPhotos.find((p) => p.id === id)!).filter(Boolean)
          return [...otherPhotos, ...sorted]
        })
        showToast('Order saved')
      }
    } catch { /* ignore */ }
    setActing(null)
  }

  async function handleDeleteApproved(photo: ApprovedPhoto) {
    setActing(photo.id)
    try {
      const res = await fetch('/api/admin/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete-approved', watchId: photo.watchId, photoId: photo.id }),
      })
      if (res.ok) {
        setApprovedPhotos((prev) => prev.filter((p) => p.id !== photo.id))
      }
    } catch { /* ignore */ }
    setActing(null)
  }

  /**
   * Approve ALL pending groups from a single user — one API call, one email.
   */
  async function handleRejectGroup(groupKey: string, photoIds: string[], reasonId: RejectionReasonId, note: string) {
    const watchId = watchIdFromKey(groupKey)
    setActing(`reject-${groupKey}`)
    try {
      const results = await Promise.all(
        photoIds.map((photoId) =>
          fetch('/api/admin/photos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'reject', watchId, photoId, rejectionReasonId: reasonId, rejectionNote: note }),
          })
        )
      )

      if (results.every((res) => res.ok)) {
        const photosToReject = pendingPhotos.filter((p) => photoIds.includes(p.id))
        setPendingPhotos((prev) => prev.filter((p) => !photoIds.includes(p.id)))
        setRejectedPhotos((prev) => [...photosToReject, ...prev])
      }
    } catch { /* ignore */ }
    setActing(null)
  }

  async function handleRestoreGroup(groupKey: string, photoIds: string[]) {
    const watchId = watchIdFromKey(groupKey)
    setActing(`restore-${groupKey}`)
    try {
      const results = await Promise.all(
        photoIds.map((photoId) =>
          fetch('/api/admin/photos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'restore', watchId, photoId }),
          })
        )
      )

      if (results.every((res) => res.ok)) {
        const photosToRestore = rejectedPhotos.filter((p) => photoIds.includes(p.id))
        setRejectedPhotos((prev) => prev.filter((p) => !photoIds.includes(p.id)))
        setPendingPhotos((prev) => [...photosToRestore, ...prev])
      }
    } catch { /* ignore */ }
    setActing(null)
  }

  async function handleDeletePending(photo: PendingPhoto) {
    if (!confirm('Delete this pending photo? This cannot be undone.')) return
    setActing(photo.id)
    try {
      const res = await fetch('/api/admin/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete-pending', watchId: photo.watchId, photoId: photo.id }),
      })
      if (res.ok) {
        setPendingPhotos((prev) => prev.filter((p) => p.id !== photo.id))
      }
    } catch { /* ignore */ }
    setActing(null)
  }

  async function handleDeleteRejected(photo: PendingPhoto) {
    if (!confirm('Permanently delete this photo? This cannot be undone.')) return
    setActing(photo.id)
    try {
      const res = await fetch('/api/admin/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', watchId: photo.watchId, photoId: photo.id }),
      })
      if (res.ok) {
        setRejectedPhotos((prev) => prev.filter((p) => p.id !== photo.id))
      }
    } catch { /* ignore */ }
    setActing(null)
  }

  async function handleDeleteRejectedGroup(groupKey: string, photoIds: string[]) {
    const watchId = watchIdFromKey(groupKey)
    setActing(`delete-group-${groupKey}`)
    try {
      await Promise.all(photoIds.map((photoId) =>
        fetch('/api/admin/photos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', watchId, photoId }),
        })
      ))
      setRejectedPhotos((prev) => prev.filter((p) => !photoIds.includes(p.id)))
    } catch { /* ignore */ }
    setActing(null)
  }

  /**
   * Split a photo out of its group: AI-identify it, update its watchId + metadata,
   * so it appears as its own submission in the pending list.
   */
  async function handleSplitPhoto(photo: PendingPhoto | ApprovedPhoto) {
    setSplittingPhotoId(photo.id)
    try {
      // Step 1: AI-identify the watch in this photo
      const identifyRes = await fetch('/api/admin/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: photo.url }),
      })
      if (!identifyRes.ok) {
        alert('AI identification failed — try again or update manually.')
        setSplittingPhotoId(null)
        return
      }
      const ai = await identifyRes.json()
      if (!ai.brand) {
        alert('Could not identify the watch in this photo.')
        setSplittingPhotoId(null)
        return
      }

      // Step 2: Build new watchId slug + metadata
      const toSlug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      const newWatchId = toSlug(`${ai.brand} ${ai.model || ''}`.trim())
      const newSlug = generatePhotoSlug(ai.brand, ai.model, newWatchId, photo.id)
      const fields: Record<string, string> = {
        watchId: newWatchId,
        slug: newSlug,
        brandName: ai.brand || '',
        modelName: ai.model || '',
        referenceNumber: ai.reference || '',
        movement: ai.movement || '',
        caseSize: ai.caseSize || '',
        lugToLug: ai.lugToLug || '',
        betweenLugs: ai.betweenLugs || '',
        thickness: ai.thickness || '',
        waterResistance: ai.waterResistance || '',
        estimatedPrice: ai.estimatedPrice || '',
      }

      // Step 3: PATCH the photo with new metadata
      const patchRes = await fetch('/api/admin/photos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoId: photo.id, fields }),
      })
      if (!patchRes.ok) {
        alert('Failed to update photo metadata.')
        setSplittingPhotoId(null)
        return
      }

      // Step 4: Update local state — change the photo's watchId + metadata so it re-groups
      setPendingPhotos((prev) =>
        prev.map((p) => p.id === photo.id ? { ...p, watchId: newWatchId, ...fields } : p)
      )

      // Re-initialize watch meta for the new group
      const newGroupKey = `${newWatchId}::${photo.userId}`
      setWatchMetaState((prev) => ({
        ...prev,
        [newGroupKey]: {
          brandName: fields.brandName,
          modelName: fields.modelName,
          referenceNumber: fields.referenceNumber,
          movement: fields.movement,
          caseSize: fields.caseSize,
          wristSize: '',
          estimatedPrice: fields.estimatedPrice,
          lugToLug: fields.lugToLug,
          betweenLugs: fields.betweenLugs,
          thickness: fields.thickness,
          waterResistance: fields.waterResistance,
        },
      }))

      showToast(`Split: ${ai.brand} ${ai.model || ''} identified`)
    } catch {
      alert('Split failed — try again.')
    }
    setSplittingPhotoId(null)
  }

  /**
   * Handle crop confirmation: upload the cropped image and update local state.
   */
  async function handleCropConfirm(croppedFile: File) {
    if (!cropTarget) return
    const { photoId } = cropTarget
    setCroppingPhotoId(photoId)
    setCropTarget(null)

    try {
      const form = new FormData()
      form.append('photoId', photoId)
      form.append('photo', croppedFile)

      const res = await fetch('/api/admin/crop', { method: 'POST', body: form })
      if (!res.ok) {
        alert('Crop upload failed.')
        setCroppingPhotoId(null)
        return
      }

      const { url, thumbnailUrl } = await res.json()

      // URL already has a unique versioned key — no query-string bust needed
      const update = (p: PendingPhoto | ApprovedPhoto) =>
        p.id === photoId ? { ...p, url, thumbnailUrl: thumbnailUrl || url } : p

      setPendingPhotos((prev) => prev.map(update) as PendingPhoto[])
      setApprovedPhotos((prev) => prev.map(update) as ApprovedPhoto[])
      setRejectedPhotos((prev) => prev.map(update) as PendingPhoto[])

      showToast('Photo cropped')
    } catch {
      alert('Crop failed — try again.')
    }
    setCroppingPhotoId(null)
  }

  /**
   * Revert a cropped photo back to its original.
   */
  async function handleRevertCrop(photo: PendingPhoto | ApprovedPhoto) {
    if (!confirm('Revert this photo to the original (pre-crop) version?')) return
    setCroppingPhotoId(photo.id)
    try {
      const res = await fetch('/api/admin/crop/revert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoId: photo.id }),
      })
      if (!res.ok) {
        alert('Revert failed.')
        setCroppingPhotoId(null)
        return
      }
      const { url, thumbnailUrl } = await res.json()
      const update = (p: PendingPhoto | ApprovedPhoto) =>
        p.id === photo.id ? { ...p, url, thumbnailUrl: thumbnailUrl || url, originalUrl: null } : p

      setPendingPhotos((prev) => prev.map(update) as PendingPhoto[])
      setApprovedPhotos((prev) => prev.map(update) as ApprovedPhoto[])
      setRejectedPhotos((prev) => prev.map(update) as PendingPhoto[])
      showToast('Reverted to original')
    } catch {
      alert('Revert failed — try again.')
    }
    setCroppingPhotoId(null)
  }

  function togglePhotoSelection(photoId: string) {
    setSelectedPhotoIds((prev) => {
      const next = new Set(prev)
      if (next.has(photoId)) next.delete(photoId)
      else next.add(photoId)
      return next
    })
  }

  function toggleGroupSelection(photoIds: string[], allSelected: boolean) {
    setSelectedPhotoIds((prev) => {
      const next = new Set(prev)
      if (allSelected) photoIds.forEach((id) => next.delete(id))
      else photoIds.forEach((id) => next.add(id))
      return next
    })
  }

  async function handleBulkApproveSelected(photoIds?: string[], actingKey = 'bulk-selected') {
    const ids = photoIds ?? Array.from(selectedPhotoIds)
    if (ids.length === 0) return

    // Group selected IDs by userId so we send one email per user
    const byUser = new Map<string, { userId: string; groups: typeof pendingGroups }>()
    filteredPendingGroups.forEach((group) => {
      const groupSelectedIds = group.photos.map((p) => p.id).filter((id) => ids.includes(id))
      if (groupSelectedIds.length === 0) return
      const uid = group.photos[0]?.userId ?? 'unknown'
      if (!byUser.has(uid)) byUser.set(uid, { userId: uid, groups: [] })
      byUser.get(uid)!.groups.push(group)
    })

    setActing(actingKey)
    try {
      for (const entry of Array.from(byUser.values())) {
        const { userId: uid, groups: userGroups } = entry
        const userSelectedIds = userGroups.flatMap((g: typeof pendingGroups[number]) => g.photos.map((p: PendingPhoto) => p.id).filter((id: string) => ids.includes(id)))
        // Save metadata first
        await Promise.all(
          userGroups.map((group: typeof pendingGroups[number]) => {
            const meta = watchMetaState[group.key]
            if (!meta) return Promise.resolve()
            const groupSelectedPhotoIds = group.photos.map((p: PendingPhoto) => p.id).filter((id: string) => ids.includes(id))
            return Promise.all(
              groupSelectedPhotoIds.map((photoId: string) =>
                fetch('/api/admin/photos', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ photoId, fields: { ...meta } }),
                })
              )
            )
          })
        )
        await fetch('/api/admin/photos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'user-approve', submitterUserId: uid, photoIds: userSelectedIds }),
        })
        const approvedSet = new Set(userSelectedIds)
        const photosToApprove = pendingPhotos.filter((p) => approvedSet.has(p.id))
        setPendingPhotos((prev) => prev.filter((p) => !approvedSet.has(p.id)))
        setApprovedPhotos((prev) => [...photosToApprove.map((p) => ({ ...p, approved: true as const })), ...prev])
      }
      setSelectedPhotoIds((prev) => (photoIds ? new Set(Array.from(prev).filter((id) => !ids.includes(id))) : new Set()))
      showToast(`Approved ${ids.length} photo${ids.length !== 1 ? 's' : ''}`)
    } catch { /* ignore */ }
    setActing(null)
  }

  function openBulkRejectModal() {
    const ids = Array.from(selectedPhotoIds)
    if (ids.length === 0) return
    const names = filteredPendingGroups
      .filter((g) => g.photos.some((p) => ids.includes(p.id)))
      .map((g) => [watchMetaState[g.key]?.brandName, watchMetaState[g.key]?.modelName].filter(Boolean).join(' ') || g.watchId)
    setRejectModal({
      groupKey: '__bulk__',
      watchName: ids.length === 1 ? (names[0] ?? '') : `${ids.length} photos`,
      photoIds: ids,
    })
  }

  async function handleBulkRejectSelected(reasonId: RejectionReasonId, note: string) {
    const ids = Array.from(selectedPhotoIds)
    // Group by group key so we pass the right watchId per photo
    const photoGroupMap = new Map<string, string>() // photoId → groupKey
    filteredPendingGroups.forEach((group) => {
      group.photos.forEach((p) => {
        if (ids.includes(p.id)) photoGroupMap.set(p.id, group.key)
      })
    })

    setActing('bulk-reject-selected')
    try {
      await Promise.all(
        ids.map((photoId) => {
          const groupKey = photoGroupMap.get(photoId) ?? ''
          const watchId = watchIdFromKey(groupKey)
          return fetch('/api/admin/photos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'reject', watchId, photoId, rejectionReasonId: reasonId, rejectionNote: note }),
          })
        })
      )
      const rejectedSet = new Set(ids)
      const photosToReject = pendingPhotos.filter((p) => rejectedSet.has(p.id))
      setPendingPhotos((prev) => prev.filter((p) => !rejectedSet.has(p.id)))
      setRejectedPhotos((prev) => [...photosToReject, ...prev])
      setSelectedPhotoIds(new Set())
      showToast(`Rejected ${ids.length} photo${ids.length !== 1 ? 's' : ''}`)
    } catch { /* ignore */ }
    setActing(null)
  }

  const tabs: { id: Tab; label: string; groups: number; photos: number }[] = [
    { id: 'pending', label: 'Pending', groups: pendingGroups.length, photos: pendingPhotos.length },
    { id: 'approved', label: 'Approved', groups: approvedGroups.length, photos: approvedPhotos.length },
    { id: 'rejected', label: 'Rejected', groups: rejectedGroups.length, photos: rejectedPhotos.length },
  ]

  const gridClass = 'grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-x-3 gap-y-7 sm:gap-x-[18px] sm:gap-y-8'

  const emptyState = (title: string, message: string) => (
    <div className="rounded-[10px] border border-dashed border-line-strong px-6 py-14 sm:py-20 text-center">
      <p className="text-lg font-semibold text-ink">{title}</p>
      <p className="mt-1.5 text-[15px] text-muted">{message}</p>
    </div>
  )

  const openGroupRejectModal = (groupKey: string) => (photoIds: string[], watchName: string) =>
    setRejectModal({ groupKey, watchName, photoIds })

  return (
    <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-8 pb-32">
      <h1 className="text-[32px] sm:text-[40px] leading-tight font-semibold tracking-[-0.04em] text-ink">Photo moderation</h1>
      <p className="mt-2 text-[15px] text-muted">Review submissions, fix watch info, and approve in batches. One email goes out per submitter.</p>

      {error && (
        <div role="alert" className="mt-6 border-l-2 border-mark bg-surface rounded-r-md px-4 py-3 text-sm text-ink">
          {error}
        </div>
      )}

      {/* Counters */}
      <dl className="mt-6 lg:mt-7 grid grid-cols-3 gap-2 sm:gap-3 max-w-[720px]">
        {tabs.map((t) => (
          <div key={t.id} className="bg-surface border border-line rounded-[10px] px-3 py-3 sm:px-[18px] sm:py-4 min-w-0">
            <dt className="font-mono text-[10px] sm:text-[11px] tracking-[1px] uppercase text-muted truncate">{t.label}</dt>
            <dd className="mt-1.5 text-2xl sm:text-[30px] leading-none font-semibold tracking-[-1px] text-ink">
              {loading ? <span className="inline-block w-8 h-6 rounded bg-subtle animate-pulse align-middle" aria-label="Loading" /> : t.photos}
            </dd>
            {!loading && (
              <dd className="mt-1.5 font-mono text-[10.5px] text-muted truncate">
                {t.groups} submission{t.groups !== 1 ? 's' : ''}
              </dd>
            )}
          </div>
        ))}
      </dl>

      {/* Tabs */}
      <div role="tablist" aria-label="Moderation status" className="mt-8 flex gap-[22px] border-b border-line overflow-x-auto scrollbar-hide">
        {tabs.map((t) => {
          const active = activeTab === t.id
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(t.id)}
              className={`h-11 flex items-center gap-2 whitespace-nowrap text-[15px] transition-colors ${
                active
                  ? 'font-semibold text-ink shadow-[inset_0_-2px_0_theme(colors.mark)]'
                  : 'font-medium text-muted hover:text-ink'
              }`}
            >
              {t.label}
              {!loading && <span className="font-mono text-xs text-muted">{t.groups}</span>}
            </button>
          )
        })}
      </div>

      {/* Search + select all */}
      <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-[480px]">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
            <Icon d={ICONS.search} className="w-4 h-4" />
          </span>
          <input
            type="search"
            placeholder="Search by brand, model, or reference"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 text-[15px] bg-surface border border-line rounded-full pl-10 pr-12 text-ink placeholder:text-faint focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink [&::-webkit-search-cancel-button]:hidden"
            aria-label="Search watches"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-0 top-0 w-11 h-11 flex items-center justify-center rounded-full text-muted hover:text-ink transition-colors"
              aria-label="Clear search"
              title="Clear search"
            >
              <Icon d={ICONS.close} className="w-4 h-4" />
            </button>
          )}
        </div>
        {activeTab === 'pending' && !loading && filteredPendingGroups.length > 0 && (() => {
          const allPendingIds = filteredPendingGroups.flatMap((g) => g.photos.map((p) => p.id))
          const allSelected = allPendingIds.length > 0 && allPendingIds.every((id) => selectedPhotoIds.has(id))
          const someSelected = !allSelected && allPendingIds.some((id) => selectedPhotoIds.has(id))
          return (
            <label className="h-11 flex items-center gap-2.5 px-1 cursor-pointer select-none w-fit">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => { if (el) el.indeterminate = someSelected }}
                onChange={() => {
                  if (allSelected) setSelectedPhotoIds(new Set())
                  else setSelectedPhotoIds(new Set(allPendingIds))
                }}
                className="w-[18px] h-[18px] accent-ink cursor-pointer"
              />
              <span className="text-sm font-medium text-ink">
                {allSelected ? 'Deselect all' : 'Select all'}
              </span>
              {selectedPhotoIds.size > 0 && (
                <span className="font-mono text-xs text-muted">{selectedPhotoIds.size} selected</span>
              )}
            </label>
          )
        })()}
      </div>

      <div className="mt-6">
        {loading ? (
          <div className={gridClass} aria-busy="true" aria-label="Loading photos">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="min-w-0">
                <div className="aspect-[4/5] rounded-md bg-subtle animate-pulse" />
                <div className="mt-2.5 h-3 w-1/3 rounded bg-subtle animate-pulse" />
                <div className="mt-2 h-4 w-2/3 rounded bg-subtle animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {activeTab === 'pending' && (
              <>
                {pendingGroups.length === 0 ? (
                  emptyState('All clear', 'No photos pending review.')
                ) : filteredPendingGroups.length === 0 ? (
                  emptyState('No matches', 'No watches match your search.')
                ) : (
                  <div className="space-y-10">
                    {/* Group by submitter user */}
                    {(() => {
                      const byUser = new Map<string, { userId: string; userName: string; groups: typeof filteredPendingGroups }>()
                      filteredPendingGroups.forEach((group) => {
                        const uid = group.photos[0]?.userId ?? 'unknown'
                        if (!byUser.has(uid)) {
                          byUser.set(uid, { userId: uid, userName: group.submitterName, groups: [] })
                        }
                        byUser.get(uid)!.groups.push(group)
                      })
                      return Array.from(byUser.values()).map(({ userId: uid, userName, groups: userGroups }) => {
                        const totalPhotos = userGroups.flatMap((g) => g.photos).length
                        return (
                          <section key={uid} aria-label={`Submissions from ${userName}`}>
                            {/* User section header */}
                            <div className="flex items-baseline gap-3 pb-3 mb-4 border-b border-line">
                              <h2 className="text-[15px] font-semibold text-ink truncate">{userName}</h2>
                              <span className="font-mono text-[11px] tracking-[0.5px] text-muted shrink-0">
                                {userGroups.length} watch{userGroups.length !== 1 ? 'es' : ''} · {totalPhotos} photo{totalPhotos !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <div className={gridClass}>
                              {userGroups.map((group) => (
                                <GroupedPhotoCard
                                  key={group.key}
                                  group={group}
                                  watchMeta={watchMetaState[group.key] ?? photoToWatchMeta(group.photos[0])}
                                  acting={acting}
                                  aiFillingGroup={aiFillingGroup}
                                  aiFilledGroupOk={aiFilledGroupOk}
                                  onUpdateWatchMeta={updateWatchMeta}
                                  onAiFillGroup={handleAiFillGroup}
                                  onSaveMetadata={handleSaveMetadata}
                                  isDirty={dirtyGroups.has(group.key)}
                                  isSavingMeta={savingMetaGroup === group.key}
                                  savedMetaOk={savedMetaGroupOk === group.key}
                                  onDelete={(photo) => handleDeletePending(photo)}
                                  onSplitPhoto={handleSplitPhoto}
                                  splittingPhotoId={splittingPhotoId}
                                  onCropPhoto={(photo) => setCropTarget({ photoId: photo.id, imageUrl: photo.url })}
                                  onRevertCrop={handleRevertCrop}
                                  croppingPhotoId={croppingPhotoId}
                                  onReorder={handleReorderPending}
                                  onApproveGroup={(photoIds) => handleBulkApproveSelected(photoIds, `approve-${group.key}`)}
                                  isApprovingGroup={acting === `approve-${group.key}`}
                                  onRejectGroup={openGroupRejectModal(group.key)}
                                  isApproved={false}
                                  selectedPhotoIds={selectedPhotoIds}
                                  onTogglePhoto={togglePhotoSelection}
                                  onToggleGroup={toggleGroupSelection}
                                />
                              ))}
                            </div>
                          </section>
                        )
                      })
                    })()}
                  </div>
                )}
              </>
            )}

            {activeTab === 'approved' && (
              <>
                {approvedGroups.length === 0 ? (
                  emptyState('Nothing live yet', 'No approved photos yet.')
                ) : filteredApprovedGroups.length === 0 ? (
                  emptyState('No matches', 'No watches match your search.')
                ) : (
                  <div className={gridClass}>
                    {filteredApprovedGroups.map((group) => (
                      <GroupedPhotoCard
                        key={group.key}
                        group={group}
                        watchMeta={watchMetaState[group.key] ?? photoToWatchMeta(group.photos[0])}
                        acting={acting}
                        aiFillingGroup={aiFillingGroup}
                        aiFilledGroupOk={aiFilledGroupOk}
                        onUpdateWatchMeta={updateWatchMeta}
                        onAiFillGroup={handleAiFillGroup}
                        onSaveMetadata={handleSaveMetadata}
                        isDirty={dirtyGroups.has(group.key)}
                        isSavingMeta={savingMetaGroup === group.key}
                        savedMetaOk={savedMetaGroupOk === group.key}
                        onDelete={(photo) => handleDeleteApproved(photo)}
                        onCropPhoto={(photo) => setCropTarget({ photoId: photo.id, imageUrl: photo.url })}
                        onRevertCrop={handleRevertCrop}
                        croppingPhotoId={croppingPhotoId}
                        onReorder={handleReorder}
                        isApproved={true}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === 'rejected' && (
              <>
                {rejectedGroups.length === 0 ? (
                  emptyState('No rejections', 'No rejected photos.')
                ) : filteredRejectedGroups.length === 0 ? (
                  emptyState('No matches', 'No watches match your search.')
                ) : (
                  <div className={gridClass}>
                    {filteredRejectedGroups.map((group) => (
                      <GroupedPhotoCard
                        key={group.key}
                        group={group}
                        watchMeta={watchMetaState[group.key] ?? photoToWatchMeta(group.photos[0])}
                        acting={acting}
                        aiFillingGroup={aiFillingGroup}
                        aiFilledGroupOk={aiFilledGroupOk}
                        onUpdateWatchMeta={updateWatchMeta}
                        onAiFillGroup={handleAiFillGroup}
                        onRestoreGroup={handleRestoreGroup}
                        onDeleteGroup={handleDeleteRejectedGroup}
                        onDelete={(photo) => handleDeleteRejected(photo)}
                        onCropPhoto={(photo) => setCropTarget({ photoId: photo.id, imageUrl: photo.url })}
                        onRevertCrop={handleRevertCrop}
                        croppingPhotoId={croppingPhotoId}
                        isApproved={false}
                        isRejected={true}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Bulk action bar — appears when photos are selected */}
      {selectedPhotoIds.size > 0 && activeTab === 'pending' && (
        <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 sm:gap-2 bg-ink text-white pl-4 pr-1.5 py-1.5 rounded-full shadow-lg max-w-[calc(100vw-24px)]">
          <span className="font-mono text-xs tracking-[0.5px] whitespace-nowrap mr-1">{selectedPhotoIds.size} selected</span>
          <button
            type="button"
            onClick={() => handleBulkApproveSelected()}
            disabled={acting === 'bulk-selected'}
            className="h-11 inline-flex items-center gap-2 rounded-full bg-surface text-ink px-4 sm:px-5 text-sm font-semibold hover:bg-subtle transition-colors disabled:opacity-60"
          >
            {acting === 'bulk-selected' ? <><Spinner /> Approving</> : 'Approve'}
          </button>
          <button
            type="button"
            onClick={openBulkRejectModal}
            disabled={acting === 'bulk-reject-selected'}
            className="h-11 inline-flex items-center rounded-full border border-white/40 px-4 sm:px-5 text-sm font-medium text-white hover:bg-white/10 transition-colors disabled:opacity-60"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={() => setSelectedPhotoIds(new Set())}
            className="w-11 h-11 inline-flex items-center justify-center rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Clear selection"
          >
            <Icon d={ICONS.close} />
          </button>
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div
          role="status"
          className={`fixed ${selectedPhotoIds.size > 0 && activeTab === 'pending' ? 'bottom-24' : 'bottom-6'} left-1/2 -translate-x-1/2 bg-ink text-white text-sm font-medium px-5 h-11 flex items-center rounded-full shadow-lg z-50 pointer-events-none whitespace-nowrap`}
        >
          {toast}
        </div>
      )}

      {/* Crop modal */}
      {cropTarget && (
        <CropModal
          imageSrc={cropTarget.imageUrl}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropTarget(null)}
        />
      )}

      {/* Reject reason modal */}
      {rejectModal && (
        <RejectModal
          watchName={rejectModal.watchName}
          onConfirm={(reasonId, note) => {
            if (rejectModal.groupKey === '__bulk__') {
              handleBulkRejectSelected(reasonId, note)
            } else {
              handleRejectGroup(rejectModal.groupKey, rejectModal.photoIds, reasonId, note)
            }
            setRejectModal(null)
          }}
          onCancel={() => setRejectModal(null)}
        />
      )}
    </div>
  )
}
