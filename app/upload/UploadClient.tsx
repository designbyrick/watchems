'use client'

import { useState, useRef, useEffect } from 'react'
import { useUser, SignInButton } from '@clerk/nextjs'
import Link from 'next/link'
import imageCompression from 'browser-image-compression'
import CropModal from './CropModal'
import { trackEvent } from '@/lib/gtag'

function toSlug(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

const ESTIMATED_PRICE_OPTIONS = [
  'Under $500',
  '$500 – $1,000',
  '$1,000 – $5,000',
  '$5,000 – $15,000',
  '$15,000 – $50,000',
  '$50,000+',
  'Prefer not to say',
]

// Strip units from AI numeric fields — model may return "40mm" despite instructions
function stripUnits(val: string | null | undefined): string {
  if (!val) return ''
  return val.toString().replace(/[^0-9.]/g, '').trim()
}

// Map a numeric USD price string from AI to the nearest dropdown bucket
function mapPriceToBucket(val: string | null | undefined): string {
  if (!val) return ''
  const n = parseFloat(val.toString().replace(/[^0-9.]/g, ''))
  if (isNaN(n)) return ''
  if (n < 500) return 'Under $500'
  if (n < 1000) return '$500 – $1,000'
  if (n < 5000) return '$1,000 – $5,000'
  if (n < 15000) return '$5,000 – $15,000'
  if (n < 50000) return '$15,000 – $50,000'
  return '$50,000+'
}

const AI_CONFIRM_FIELDS = [
  'brand', 'model', 'reference', 'movement', 'caseSize',
  'lugToLug', 'betweenLugs', 'thickness', 'waterResistance',
  'wristSize', 'estimatedPrice',
] as const
type AiConfirmField = (typeof AI_CONFIRM_FIELDS)[number]

type PhotoStatus = 'compressing' | 'ready' | 'uploading' | 'done' | 'error'

interface AiCandidate {
  brand: string
  model: string
  reference: string | null
  movement: string | null
  caseSize: string | null
  wristSize: string | null
  estimatedPrice: string | null
  lugToLug: string | null
  betweenLugs: string | null
  thickness: string | null
  waterResistance: string | null
  dialColor: string | null
  bezelColor: string | null
  caseMaterial: string | null
  strapType: string | null
  watchStyle: string | null
  confidence: 'high' | 'medium' | 'low'
  reasoning: string
}

interface HiddenAiFields {
  dialColor: string
  bezelColor: string
  caseMaterial: string
  strapType: string
  watchStyle: string
}

interface PhotoItem {
  id: string
  file: File
  preview: string
  status: PhotoStatus
  errorMessage: string
}

// All watch metadata is shared across photos (same watch, multiple angles)
interface WatchMeta {
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
  isWatch: boolean | null
  aiGenerated: boolean | null
  aiIdentified: boolean
  identifyStatus: 'idle' | 'identifying' | 'done' | 'error'
  aiFilledFields: Set<AiConfirmField>
  aiConfirmedFields: Partial<Record<AiConfirmField, boolean>>
}

function createItem(file: File): PhotoItem {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    file,
    preview: '',
    status: 'compressing',
    errorMessage: '',
  }
}

function defaultMeta(): WatchMeta {
  return {
    brandName: '',
    modelName: '',
    referenceNumber: '',
    movement: '',
    caseSize: '',
    wristSize: '',
    estimatedPrice: '',
    lugToLug: '',
    betweenLugs: '',
    thickness: '',
    waterResistance: '',
    isWatch: null,
    aiGenerated: null,
    aiIdentified: false,
    identifyStatus: 'idle',
    aiFilledFields: new Set(),
    aiConfirmedFields: {},
  }
}

const MAX_PHOTOS = 20

export default function UploadClient() {
  const { isSignedIn, isLoaded } = useUser()
  const [items, setItems] = useState<PhotoItem[]>([])
  const [meta, setMeta] = useState<WatchMeta>(defaultMeta())
  const hiddenAiFieldsRef = useRef<HiddenAiFields>({ dialColor: '', bezelColor: '', caseMaterial: '', strapType: '', watchStyle: '' })
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [globalError, setGlobalError] = useState('')
  const [success, setSuccess] = useState(false)
  const [successPreviews, setSuccessPreviews] = useState<string[]>([])
  const [partialSuccess, setPartialSuccess] = useState('')
  const [pendingCrop, setPendingCrop] = useState<{ src: string; file: File; id: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const filesById = useRef<Map<string, File>>(new Map())
  const metaRef = useRef(meta)
  useEffect(() => { metaRef.current = meta }, [meta])

  function patchItem(id: string, patch: Partial<PhotoItem>) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  function patchMeta(patch: Partial<WatchMeta>) {
    setMeta((prev) => ({ ...prev, ...patch }))
  }

  async function compressImage(file: File): Promise<File> {
    try {
      const blob = await imageCompression(file, {
        maxSizeMB: 3,
        maxWidthOrHeight: 2400,
        useWebWorker: true,
        fileType: 'image/webp',
        initialQuality: 0.85,
      })
      return new File([blob], file.name, { type: 'image/webp' })
    } catch {
      return file
    }
  }

  function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.readAsDataURL(file)
    })
  }

  // ── AI identification (runs on primary photo only) ─────────────────────────

  async function identifyPrimary(primaryId: string) {
    const file = filesById.current.get(primaryId)
    if (!file) return

    patchMeta({ identifyStatus: 'identifying' })

    try {
      const formData = new FormData()
      formData.append('photo', file)
      const res = await fetch('/api/photos/identify', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Identification failed')
      const data = await res.json()

      const metaPatch: Partial<WatchMeta> = {
        isWatch: data.isWatch,
        aiGenerated: data.isAiGenerated ?? null,
        identifyStatus: 'done',
      }

      if (data.candidates?.[0]) {
        const c = data.candidates[0] as AiCandidate
        const filled = new Set<AiConfirmField>()

        // Only fill empty fields — preserve anything the user already typed
        const currentMeta = metaRef.current
        const fieldMap: { ai: keyof AiCandidate; meta: keyof WatchMeta; confirm: AiConfirmField }[] = [
          { ai: 'brand', meta: 'brandName', confirm: 'brand' },
          { ai: 'model', meta: 'modelName', confirm: 'model' },
          { ai: 'reference', meta: 'referenceNumber', confirm: 'reference' },
          { ai: 'movement', meta: 'movement', confirm: 'movement' },
          { ai: 'caseSize', meta: 'caseSize', confirm: 'caseSize' },
          { ai: 'wristSize', meta: 'wristSize', confirm: 'wristSize' },
          { ai: 'estimatedPrice', meta: 'estimatedPrice', confirm: 'estimatedPrice' },
          { ai: 'lugToLug', meta: 'lugToLug', confirm: 'lugToLug' },
          { ai: 'betweenLugs', meta: 'betweenLugs', confirm: 'betweenLugs' },
          { ai: 'thickness', meta: 'thickness', confirm: 'thickness' },
          { ai: 'waterResistance', meta: 'waterResistance', confirm: 'waterResistance' },
        ]

        // Numeric fields where units must be stripped
        const numericFields = new Set<AiConfirmField>(['caseSize', 'lugToLug', 'betweenLugs', 'thickness', 'waterResistance'])

        for (const { ai, meta: metaKey, confirm } of fieldMap) {
          const aiVal = c[ai]
          if (aiVal && !(currentMeta[metaKey] as string).trim()) {
            let mapped: string = String(aiVal)
            if (confirm === 'estimatedPrice') {
              mapped = mapPriceToBucket(mapped)
            } else if (numericFields.has(confirm)) {
              mapped = stripUnits(mapped)
            }
            if (mapped) {
              filled.add(confirm)
              ;(metaPatch as Record<string, unknown>)[metaKey] = mapped
            }
          }
        }

        Object.assign(metaPatch, {
          aiIdentified: true,
          aiFilledFields: filled,
          aiConfirmedFields: {},
        })

        trackEvent('upload_ai_identified', {
          brand: c.brand ?? null,
          model: c.model ?? null,
          confidence: c.confidence ?? null,
          fields_filled: filled.size,
        })

        // Silently capture visual characteristics (not shown to user)
        hiddenAiFieldsRef.current = {
          dialColor: c.dialColor ?? '',
          bezelColor: c.bezelColor ?? '',
          caseMaterial: c.caseMaterial ?? '',
          strapType: c.strapType ?? '',
          watchStyle: c.watchStyle ?? '',
        }
      }

      patchMeta(metaPatch)
    } catch {
      patchMeta({ identifyStatus: 'error', isWatch: true })
    }
  }

  // ── File intake ────────────────────────────────────────────────────────────

  async function processFiles(rawFiles: FileList | File[]) {
    setGlobalError('')
    const arr = Array.from(rawFiles)
    const valid: File[] = []
    const errs: string[] = []

    for (const f of arr) {
      if (f.size > 20 * 1024 * 1024) {
        errs.push(`${f.name}: exceeds 20MB`)
        continue
      }
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(f.type)) {
        errs.push(`${f.name}: unsupported format`)
        continue
      }
      valid.push(f)
    }

    if (errs.length) setGlobalError(errs.join(' · '))
    if (!valid.length) return

    const placeholders = valid.map((f) => createItem(f))

    setItems((prev) => {
      const slots = MAX_PHOTOS - prev.length
      if (slots <= 0) return prev
      return [...prev, ...placeholders.slice(0, slots)]
    })

    await Promise.all(
      placeholders.map(async (placeholder) => {
        try {
          const compressed = await compressImage(placeholder.file)
          const preview = await fileToDataUrl(compressed)
          filesById.current.set(placeholder.id, compressed)
          patchItem(placeholder.id, { file: compressed, preview, status: 'ready' })
        } catch {
          patchItem(placeholder.id, { status: 'error', errorMessage: 'Failed to process image' })
        }
      })
    )

    // No longer auto-identify — user triggers via button
    const readyCount = placeholders.length
    if (readyCount > 0) {
      trackEvent('upload_file_selected', { photo_count: readyCount })
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) {
      processFiles(e.target.files)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (e.dataTransfer.files?.length) processFiles(e.dataTransfer.files)
  }

  // ── Photo management ───────────────────────────────────────────────────────

  function setPrimary(id: string) {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === id)
      if (idx <= 0) return prev
      const next = [...prev]
      const [item] = next.splice(idx, 1)
      next.unshift(item)
      return next
    })
  }

  function removeItem(id: string) {
    const wasPrimary = items.length > 0 && items[0].id === id

    setItems((prev) => prev.filter((i) => i.id !== id))
    filesById.current.delete(id)
    if (pendingCrop?.id === id) setPendingCrop(null)

    if (wasPrimary) {
      patchMeta({
        identifyStatus: 'idle', aiIdentified: false,
        aiFilledFields: new Set(), aiConfirmedFields: {},
        isWatch: null, aiGenerated: null,
      })
    }
  }

  // ── Crop ───────────────────────────────────────────────────────────────────

  function handleCropConfirm(croppedFile: File, croppedDataUrl: string) {
    if (!pendingCrop) return
    const { id } = pendingCrop
    filesById.current.set(id, croppedFile)
    patchItem(id, { file: croppedFile, preview: croppedDataUrl })
    setPendingCrop(null)
  }

  function handleCropCancel() {
    setPendingCrop(null)
  }

  // ── Form field helpers ─────────────────────────────────────────────────────

  function metaChange(field: string, value: string) {
    patchMeta({ [field]: value } as Partial<WatchMeta>)
  }

  function confirmField(field: AiConfirmField) {
    patchMeta({ aiConfirmedFields: { ...meta.aiConfirmedFields, [field]: true } })
  }

  const AI_TO_META_KEY: Record<AiConfirmField, keyof WatchMeta> = {
    brand: 'brandName',
    model: 'modelName',
    reference: 'referenceNumber',
    movement: 'movement',
    caseSize: 'caseSize',
    lugToLug: 'lugToLug',
    betweenLugs: 'betweenLugs',
    thickness: 'thickness',
    waterResistance: 'waterResistance',
    wristSize: 'wristSize',
    estimatedPrice: 'estimatedPrice',
  }

  function rejectField(field: AiConfirmField) {
    const metaKey = AI_TO_META_KEY[field]
    const nextFilled = new Set(meta.aiFilledFields)
    nextFilled.delete(field)
    const nextConfirmed = { ...meta.aiConfirmedFields }
    delete nextConfirmed[field]
    patchMeta({
      [metaKey]: '',
      aiFilledFields: nextFilled,
      aiConfirmedFields: nextConfirmed,
    } as Partial<WatchMeta>)
  }

  function isAiUnconfirmed(field: AiConfirmField) {
    return meta.aiIdentified && meta.aiFilledFields.has(field) && !meta.aiConfirmedFields[field]
  }

  function fieldBorderClass(field: AiConfirmField) {
    if (isAiUnconfirmed(field)) return 'border-blue-400 ring-1 ring-blue-300 dark:ring-blue-600'
    if (meta.aiIdentified && meta.aiFilledFields.has(field) && meta.aiConfirmedFields[field]) return 'border-green-400'
    return 'border-line-strong focus:border-ink'
  }

  function inputPrClass(field: AiConfirmField) {
    if (!meta.aiIdentified || !meta.aiFilledFields.has(field)) return ''
    return isAiUnconfirmed(field) ? 'pr-14' : 'pr-8'
  }

  function InlineConfirm({ field }: { field: AiConfirmField }) {
    if (isAiUnconfirmed(field)) {
      return (
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => confirmField(field)}
            aria-label={`Accept AI suggestion for ${field}`}
            className="w-5 h-5 flex items-center justify-center text-blue-500 hover:text-blue-700 font-bold text-sm transition-colors"
          >
            ✓
          </button>
          <button
            type="button"
            onClick={() => rejectField(field)}
            aria-label={`Reject AI suggestion for ${field}`}
            className="w-5 h-5 flex items-center justify-center text-red-500 hover:text-red-700 font-bold text-sm transition-colors"
          >
            ✕
          </button>
        </div>
      )
    }
    if (meta.aiIdentified && meta.aiFilledFields.has(field) && meta.aiConfirmedFields[field]) {
      return <span className="absolute right-2 top-1/2 -translate-y-1/2 text-green-500 text-sm" aria-label="Confirmed">✓</span>
    }
    return null
  }

  const aiFilledCount = meta.aiFilledFields.size
  const aiConfirmedCount = AI_CONFIRM_FIELDS.filter(
    (f) => meta.aiFilledFields.has(f) && meta.aiConfirmedFields[f]
  ).length

  // ── Submit ─────────────────────────────────────────────────────────────────

  function isFormReady() {
    if (items.filter((i) => i.status === 'ready').length === 0) return false
    if (!meta.brandName.trim()) return false
    if (meta.isWatch === false) return false
    if (!termsAccepted) return false
    return true
  }

  async function uploadItem(item: PhotoItem): Promise<void> {
    patchItem(item.id, { status: 'uploading', errorMessage: '' })
    const file = filesById.current.get(item.id) || item.file
    const watchId = toSlug(`${meta.brandName} ${meta.modelName}`)
    const formData = new FormData()
    formData.append('photo', file)
    if (meta.brandName.trim()) formData.append('brandName', meta.brandName.trim())
    if (meta.modelName.trim()) formData.append('modelName', meta.modelName.trim())
    if (meta.referenceNumber.trim()) formData.append('referenceNumber', meta.referenceNumber.trim())
    if (meta.movement) formData.append('movement', meta.movement)
    if (meta.caseSize.trim()) formData.append('caseSize', meta.caseSize.trim())
    if (meta.wristSize) formData.append('wristSize', meta.wristSize)
    if (meta.estimatedPrice) formData.append('estimatedPrice', meta.estimatedPrice)
    if (meta.lugToLug.trim()) formData.append('lugToLug', meta.lugToLug.trim())
    if (meta.betweenLugs.trim()) formData.append('betweenLugs', meta.betweenLugs.trim())
    if (meta.thickness.trim()) formData.append('thickness', meta.thickness.trim())
    if (meta.waterResistance.trim()) formData.append('waterResistance', meta.waterResistance.trim())

    // Silently append AI-detected visual characteristics (hidden from user)
    const h = hiddenAiFieldsRef.current
    if (h.dialColor) formData.append('dialColor', h.dialColor)
    if (h.bezelColor) formData.append('bezelColor', h.bezelColor)
    if (h.caseMaterial) formData.append('caseMaterial', h.caseMaterial)
    if (h.strapType) formData.append('strapType', h.strapType)
    if (h.watchStyle) formData.append('watchStyle', h.watchStyle)

    const res = await fetch(`/api/photos/${watchId}`, { method: 'POST', body: formData })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Upload failed')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPartialSuccess('')
    if (!isFormReady()) return

    const readyItems = items.filter((i) => i.status === 'ready')
    let successCount = 0
    let failCount = 0

    trackEvent('upload_submitted', {
      photo_count: readyItems.length,
      brand: meta.brandName || null,
      model: meta.modelName || null,
      ai_assisted: meta.aiIdentified,
    })

    for (const item of readyItems) {
      try {
        await uploadItem(item)
        patchItem(item.id, { status: 'done' })
        successCount++
      } catch (err) {
        patchItem(item.id, {
          status: 'error',
          errorMessage: err instanceof Error ? err.message : 'Upload failed',
        })
        failCount++
      }
    }

    if (successCount > 0 && failCount === 0) {
      setSuccessPreviews(readyItems.map((i) => i.preview))
      setSuccess(true)
      trackEvent('upload_success', {
        photo_count: successCount,
        brand: meta.brandName || null,
        model: meta.modelName || null,
        ai_assisted: meta.aiIdentified,
      })
    } else if (successCount > 0 && failCount > 0) {
      setPartialSuccess(
        `${successCount} photo${successCount !== 1 ? 's' : ''} uploaded. ${failCount} failed — fix errors and retry.`
      )
    }
  }

  async function retryUpload(id: string) {
    const item = items.find((i) => i.id === id)
    if (!item) return
    try {
      await uploadItem({ ...item, status: 'ready' })
      patchItem(id, { status: 'done' })
    } catch (err) {
      patchItem(id, {
        status: 'error',
        errorMessage: err instanceof Error ? err.message : 'Upload failed',
      })
    }
  }

  // ── Derived state ──────────────────────────────────────────────────────────

  const primaryItem = items[0] ?? null
  const hasItems = items.length > 0
  const atMax = items.length >= MAX_PHOTOS
  const isUploading = items.some((i) => i.status === 'uploading')
  const readyCount = items.filter((i) => i.status === 'ready').length
  const canSubmit = isFormReady() && !isUploading

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="animate-pulse text-faint">Loading...</div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-canvas text-ink">
      <div className={`max-w-[80rem] mx-auto px-4 ${success ? 'py-12 sm:py-16' : 'py-8 sm:py-12'}`}>
        {!success && (
          <>
            <Link href="/" className="text-xs sm:text-sm text-faint hover:text-ink mb-6 inline-block">
              &larr; Back to home
            </Link>

            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Upload Your Watch Photos</h1>
            <p className="text-faint mb-8 text-sm sm:text-base">
              Share real wrist shots. Help others see how watches look in real life.
            </p>
          </>
        )}

        {!isSignedIn ? (
          <div className="bg-surface border border-line-strong rounded-xl p-6 sm:p-8 text-center shadow-sm">
            <p className="text-muted mb-4 text-sm sm:text-base">Sign in to upload your watch photos</p>
            <SignInButton mode="modal">
              <button className="px-4 sm:px-6 py-2 sm:py-3 bg-ink hover:bg-ink-hover text-white rounded-lg font-medium transition-colors text-sm sm:text-base w-full sm:w-auto">
                Sign in to upload
              </button>
            </SignInButton>
          </div>
        ) : success ? (
          <div className="max-w-lg mx-auto bg-surface border border-line-strong rounded-2xl p-6 sm:p-8 text-center shadow-sm">
            {successPreviews.length > 0 && (
              <div className="flex justify-center gap-2 sm:gap-3 mb-5 flex-wrap">
                {successPreviews.map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={src} className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-xl shadow-sm" alt={`Submitted photo ${i + 1}`} />
                ))}
              </div>
            )}
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-ink mb-1.5">
              {successPreviews.length > 1 ? 'Photos submitted!' : 'Photo submitted!'}
            </h2>
            <p className="text-faint mb-4 text-sm">
              Your {successPreviews.length > 1 ? 'images are' : 'image is'} being reviewed and will be approved soon.
            </p>
            {meta.brandName && (
              <p className="text-xs text-faint mb-6">
                Once approved, your photo will appear on the{' '}
                <Link
                  href={`/brand/${encodeURIComponent(meta.brandName.toLowerCase())}`}
                  className="underline underline-offset-2 hover:text-ink transition-colors"
                >
                  {meta.brandName} page
                </Link>
                .
              </p>
            )}

            {/* Dashboard feature CTAs — 3-col grid */}
            <p className="text-xs font-semibold text-faint uppercase tracking-wider mb-3">While you wait</p>
            <div className="grid grid-cols-3 gap-3 mb-6">
              <Link href="/dashboard" className="flex flex-col items-center gap-2 p-3 rounded-xl bg-gray-50 border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group">
                <span className="text-2xl">⌚</span>
                <p className="text-xs font-semibold text-gray-800 group-hover:text-blue-700 leading-tight">My Watches</p>
                <p className="text-[10px] text-gray-400 leading-tight">Your submissions</p>
              </Link>
              <Link href="/dashboard/wrist-check" className="flex flex-col items-center gap-2 p-3 rounded-xl bg-gray-50 border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group">
                <span className="text-2xl">📅</span>
                <p className="text-xs font-semibold text-gray-800 group-hover:text-blue-700 leading-tight">Wrist Check</p>
                <p className="text-[10px] text-gray-400 leading-tight">Daily wear log</p>
              </Link>
              <Link href="/dashboard/boards" className="flex flex-col items-center gap-2 p-3 rounded-xl bg-gray-50 border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group">
                <span className="text-2xl">🗂️</span>
                <p className="text-xs font-semibold text-gray-800 group-hover:text-blue-700 leading-tight">Collections</p>
                <p className="text-[10px] text-gray-400 leading-tight">Save & organise</p>
              </Link>
            </div>

            <div className="flex flex-col gap-2">
              <Link
                href="/"
                className="px-6 py-2.5 bg-ink hover:bg-ink-hover text-white rounded-lg font-medium transition-colors inline-block text-center text-sm"
              >
                &larr; Back to home
              </Link>
              <button
                onClick={() => {
                  setSuccess(false)
                  setItems([])
                  setMeta(defaultMeta())
                  setGlobalError('')
                  setSuccessPreviews([])
                  setPartialSuccess('')
                  filesById.current.clear()
                }}
                className="px-6 py-2.5 bg-canvas hover:bg-canvas/80 text-ink rounded-lg font-medium transition-colors text-sm"
              >
                Upload more
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {globalError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">{globalError}</p>
              </div>
            )}
            {partialSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">{partialSuccess}</p>
              </div>
            )}

            {/* Two-column layout: photo left, form right */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-start">

              {/* ── LEFT: Photo area ── */}
              <div className="bg-surface border border-line-strong rounded-xl p-4 shadow-sm space-y-4">

                {/* Primary photo preview or drop zone */}
                {hasItems && primaryItem?.preview ? (
                  <div className="relative rounded-lg overflow-hidden bg-gray-100 aspect-[4/3] flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={primaryItem.preview} alt="Primary photo" className="w-full h-full object-contain" />

                    {meta.identifyStatus === 'identifying' && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="text-white text-sm flex items-center gap-2">
                          <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                          Identifying watch...
                        </div>
                      </div>
                    )}

                    <div className="absolute top-2 left-2 bg-ink text-white text-xs px-2 py-0.5 rounded-full font-medium">
                      Primary
                    </div>

                    <button
                      type="button"
                      onClick={() => setPendingCrop({ src: primaryItem.preview, file: primaryItem.file, id: primaryItem.id })}
                      className="absolute bottom-2 left-2 bg-white/80 text-xs px-2 py-1 rounded shadow hover:bg-white text-gray-700"
                    >
                      ✂ Crop
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileRef.current?.click()}
                    className={`aspect-[4/3] border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors ${
                      isDragging ? 'border-ink bg-ink/5' : 'border-line-strong hover:border-ink'
                    }`}
                  >
                    {hasItems ? (
                      <div className="text-faint text-sm flex items-center gap-2">
                        <span className="animate-spin inline-block w-4 h-4 border-2 border-faint border-t-transparent rounded-full" />
                        Processing...
                      </div>
                    ) : (
                      <>
                        <div className="text-4xl mb-3">📷</div>
                        <p className="text-faint text-sm text-center px-4">
                          {isDragging ? 'Drop your photos here' : 'Drag & drop or click to add photos'}
                        </p>
                        <p className="text-faint text-xs mt-1">JPEG, PNG, WebP · Up to 20MB each</p>
                        <p className="text-faint text-[11px] mt-2.5">🔒 GPS location, camera info &amp; all EXIF metadata are automatically removed</p>
                      </>
                    )}
                  </div>
                )}

                {/* Thumbnail strip + add button */}
                {hasItems && (
                  <div className="flex flex-wrap gap-2">
                    {items.map((item, i) => (
                      <div key={item.id} className="relative group">
                        <div
                          onClick={() => { if (i > 0 && item.status !== 'uploading') setPrimary(item.id) }}
                          className={`w-16 h-16 rounded-lg overflow-hidden bg-canvas ${
                            i === 0
                              ? 'ring-2 ring-ink'
                              : item.status !== 'uploading'
                              ? 'cursor-pointer hover:ring-2 hover:ring-ink/60'
                              : ''
                          }`}
                        >
                          {item.preview ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.preview} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="animate-spin w-3 h-3 border-2 border-faint border-t-transparent rounded-full" />
                            </div>
                          )}
                          {item.status === 'uploading' && (
                            <div className="absolute inset-0 bg-blue-500/40 rounded-lg flex items-center justify-center">
                              <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                            </div>
                          )}
                          {item.status === 'done' && (
                            <div className="absolute inset-0 bg-green-500/40 rounded-lg flex items-center justify-center">
                              <span className="text-white font-bold text-lg">✓</span>
                            </div>
                          )}
                          {item.status === 'error' && (
                            <div className="absolute inset-0 bg-red-500/40 rounded-lg flex items-center justify-center">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); retryUpload(item.id) }}
                                className="text-white text-[10px] font-bold bg-red-600/80 px-1.5 py-0.5 rounded"
                                title={item.errorMessage || 'Retry upload'}
                              >
                                Retry
                              </button>
                            </div>
                          )}
                        </div>

                        {item.status !== 'uploading' && item.status !== 'done' && (
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label="Remove photo"
                          >
                            &times;
                          </button>
                        )}

                        {i > 0 && item.status === 'ready' && (
                          <div className="absolute bottom-0 left-0 right-0 text-center pointer-events-none">
                            <span className="text-[9px] text-white bg-black/60 px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              Set primary
                            </span>
                          </div>
                        )}
                      </div>
                    ))}

                    {!atMax && (
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="w-16 h-16 border-2 border-dashed border-line-strong hover:border-ink rounded-lg flex items-center justify-center text-faint hover:text-ink transition-colors text-2xl leading-none"
                        aria-label="Add more photos"
                      >
                        +
                      </button>
                    )}
                  </div>
                )}

                {/* Drop zone for adding more angles */}
                {hasItems && !atMax && (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border border-dashed rounded-lg py-2 text-center text-xs transition-colors ${
                      isDragging
                        ? 'border-ink bg-ink/5 text-ink'
                        : 'border-line-strong text-faint'
                    }`}
                  >
                    Drop more angles here · {items.length}/{MAX_PHOTOS} photos
                  </div>
                )}
              </div>

              {/* ── RIGHT: Watch form ── */}
              <div className="bg-surface border border-line-strong rounded-xl p-5 shadow-sm space-y-5">

                {/* Warnings */}
                {meta.isWatch === false && (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                    <p className="text-xs text-yellow-800 dark:text-yellow-200">
                      ⚠️ This doesn&apos;t look like a watch photo. You can still submit if the AI is incorrect.
                    </p>
                  </div>
                )}
                {meta.aiGenerated === true && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                    <p className="text-xs text-amber-800 dark:text-amber-200">
                      ⚠️ Photo may be AI-generated. AI images won&apos;t be approved.
                    </p>
                  </div>
                )}

                {/* AI auto-fill button */}
                {primaryItem && meta.identifyStatus === 'idle' && (
                  <button
                    type="button"
                    onClick={() => identifyPrimary(primaryItem.id)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                    </svg>
                    Auto-fill with AI
                  </button>
                )}

                {/* AI identification status */}
                {meta.identifyStatus === 'identifying' && (
                  <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg text-sm text-blue-700 dark:text-blue-300">
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                    Identifying watch...
                  </div>
                )}
                {meta.identifyStatus === 'error' && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-faint">Identification failed — fill in details manually</span>
                    {primaryItem && (
                      <button
                        type="button"
                        onClick={() => {
                          patchMeta({
                            identifyStatus: 'idle', aiIdentified: false,
                            aiFilledFields: new Set(), aiConfirmedFields: {},
                          })
                        }}
                        className="text-faint hover:text-ink underline ml-3"
                      >
                        Try again
                      </button>
                    )}
                  </div>
                )}
                {meta.identifyStatus === 'done' && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-faint">Watch identified from primary photo</span>
                    {primaryItem && (
                      <button
                        type="button"
                        onClick={() => {
                          patchMeta({
                            identifyStatus: 'idle', aiIdentified: false,
                            aiFilledFields: new Set(), aiConfirmedFields: {},
                          })
                        }}
                        className="text-faint hover:text-ink underline ml-3"
                      >
                        Re-identify
                      </button>
                    )}
                  </div>
                )}

                {/* AI confirmation progress */}
                {meta.aiIdentified && aiFilledCount > 0 && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-blue-800 dark:text-blue-200">
                        AI filled {aiFilledCount} field{aiFilledCount !== 1 ? 's' : ''} — verify each one
                      </span>
                      <span className="text-xs text-blue-700 dark:text-blue-300 tabular-nums">
                        {aiConfirmedCount}/{aiFilledCount}
                      </span>
                    </div>
                    <div className="h-1 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-300"
                        style={{ width: `${(aiConfirmedCount / aiFilledCount) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1.5">
                      Click ✓ to keep or ✕ to clear each highlighted field.
                    </p>
                  </div>
                )}

                {/* Brand */}
                <div>
                  <label className="block text-sm font-medium text-muted mb-1.5">
                    Brand <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={meta.brandName}
                      onChange={(e) => metaChange('brandName', e.target.value)}
                      placeholder="e.g. Rolex"
                      maxLength={80}
                      className={`w-full bg-canvas rounded-md px-3 py-2.5 text-sm text-ink placeholder-faint focus:outline-none shadow-sm transition-colors border ${fieldBorderClass('brand')} ${inputPrClass('brand')}`}
                    />
                    <InlineConfirm field="brand" />
                  </div>
                </div>

                {/* Model */}
                <div>
                  <label className="block text-sm font-medium text-muted mb-1.5">
                    Model <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={meta.modelName}
                      onChange={(e) => metaChange('modelName', e.target.value)}
                      placeholder="e.g. Submariner"
                      maxLength={100}
                      className={`w-full bg-canvas rounded-md px-3 py-2.5 text-sm text-ink placeholder-faint focus:outline-none shadow-sm transition-colors border ${fieldBorderClass('model')} ${inputPrClass('model')}`}
                    />
                    <InlineConfirm field="model" />
                  </div>
                </div>

                {/* Optional details — always visible */}
                <div className="space-y-4">
                    {/* Reference */}
                    <div>
                      <label className="block text-sm font-medium text-muted mb-1.5">Reference</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={meta.referenceNumber}
                          onChange={(e) => metaChange('referenceNumber', e.target.value)}
                          placeholder="e.g. 126610LN"
                          maxLength={60}
                          className={`w-full bg-canvas rounded-md px-3 py-2.5 text-sm text-ink placeholder-faint focus:outline-none shadow-sm border ${fieldBorderClass('reference')} ${inputPrClass('reference')}`}
                        />
                        <InlineConfirm field="reference" />
                      </div>
                    </div>

                    {/* Movement */}
                    <div>
                      <label className="block text-sm font-medium text-muted mb-1.5">Movement</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={meta.movement}
                          onChange={(e) => metaChange('movement', e.target.value)}
                          placeholder="e.g. Automatic"
                          maxLength={60}
                          className={`w-full bg-canvas rounded-md px-3 py-2.5 text-sm text-ink placeholder-faint focus:outline-none shadow-sm border ${fieldBorderClass('movement')} ${inputPrClass('movement')}`}
                        />
                        <InlineConfirm field="movement" />
                      </div>
                    </div>

                    {/* Case dimensions — grouped 2×2 */}
                    <div>
                      <label className="block text-sm font-medium text-muted mb-1.5">Dimensions</label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-1.5">
                          <div className="relative flex-1 min-w-0">
                            <input
                              type="text"
                              value={meta.caseSize}
                              onChange={(e) => metaChange('caseSize', e.target.value)}
                              placeholder="Case"
                              maxLength={20}
                              className={`w-full bg-canvas rounded-md px-2.5 py-2 text-sm text-ink placeholder-faint focus:outline-none shadow-sm border ${fieldBorderClass('caseSize')} ${inputPrClass('caseSize')}`}
                            />
                            <InlineConfirm field="caseSize" />
                          </div>
                          <span className="text-xs text-faint flex-shrink-0">mm</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="relative flex-1 min-w-0">
                            <input
                              type="text"
                              value={meta.lugToLug}
                              onChange={(e) => metaChange('lugToLug', e.target.value)}
                              placeholder="Lug-to-lug"
                              maxLength={20}
                              className={`w-full bg-canvas rounded-md px-2.5 py-2 text-sm text-ink placeholder-faint focus:outline-none shadow-sm border ${fieldBorderClass('lugToLug')} ${inputPrClass('lugToLug')}`}
                            />
                            <InlineConfirm field="lugToLug" />
                          </div>
                          <span className="text-xs text-faint flex-shrink-0">mm</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="relative flex-1 min-w-0">
                            <input
                              type="text"
                              value={meta.betweenLugs}
                              onChange={(e) => metaChange('betweenLugs', e.target.value)}
                              placeholder="Lug width"
                              maxLength={20}
                              className={`w-full bg-canvas rounded-md px-2.5 py-2 text-sm text-ink placeholder-faint focus:outline-none shadow-sm border ${fieldBorderClass('betweenLugs')} ${inputPrClass('betweenLugs')}`}
                            />
                            <InlineConfirm field="betweenLugs" />
                          </div>
                          <span className="text-xs text-faint flex-shrink-0">mm</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="relative flex-1 min-w-0">
                            <input
                              type="text"
                              value={meta.thickness}
                              onChange={(e) => metaChange('thickness', e.target.value)}
                              placeholder="Thickness"
                              maxLength={20}
                              className={`w-full bg-canvas rounded-md px-2.5 py-2 text-sm text-ink placeholder-faint focus:outline-none shadow-sm border ${fieldBorderClass('thickness')} ${inputPrClass('thickness')}`}
                            />
                            <InlineConfirm field="thickness" />
                          </div>
                          <span className="text-xs text-faint flex-shrink-0">mm</span>
                        </div>
                      </div>
                    </div>

                    {/* Water resistance */}
                    <div>
                      <label className="block text-sm font-medium text-muted mb-1.5">Water resistance</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={meta.waterResistance}
                          onChange={(e) => metaChange('waterResistance', e.target.value)}
                          placeholder="e.g. 300m / 1000ft"
                          maxLength={40}
                          className={`w-full bg-canvas rounded-md px-3 py-2.5 text-sm text-ink placeholder-faint focus:outline-none shadow-sm border ${fieldBorderClass('waterResistance')} ${inputPrClass('waterResistance')}`}
                        />
                        <InlineConfirm field="waterResistance" />
                      </div>
                    </div>

                    {/* Wrist size + Price */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-muted mb-1.5">Wrist size</label>
                        <div className="flex gap-1 items-center">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={meta.wristSize}
                            onChange={(e) => metaChange('wristSize', e.target.value)}
                            placeholder='e.g. 7.25"'
                            className={`flex-1 min-w-0 bg-canvas rounded-md px-2 py-2.5 text-sm text-ink focus:outline-none shadow-sm border ${fieldBorderClass('wristSize')}`}
                          />
                          {isAiUnconfirmed('wristSize') && (
                            <>
                              <button type="button" onClick={() => confirmField('wristSize')} aria-label="Accept AI suggestion for wrist size" className="flex-shrink-0 w-6 h-7 flex items-center justify-center text-blue-500 hover:text-blue-700 font-bold text-sm">✓</button>
                              <button type="button" onClick={() => rejectField('wristSize')} aria-label="Reject AI suggestion for wrist size" className="flex-shrink-0 w-6 h-7 flex items-center justify-center text-red-500 hover:text-red-700 font-bold text-sm">✕</button>
                            </>
                          )}
                          {meta.aiIdentified && meta.aiFilledFields.has('wristSize') && meta.aiConfirmedFields['wristSize'] && (
                            <span className="flex-shrink-0 w-7 h-7 flex items-center justify-center text-green-500 text-sm">✓</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-muted mb-1.5">Est. value</label>
                        <div className="flex gap-1 items-center">
                          <select
                            value={meta.estimatedPrice}
                            onChange={(e) => metaChange('estimatedPrice', e.target.value)}
                            className={`flex-1 min-w-0 bg-canvas rounded-md px-2 py-2.5 text-sm text-ink focus:outline-none shadow-sm border ${fieldBorderClass('estimatedPrice')}`}
                          >
                            <option value="">Select...</option>
                            {ESTIMATED_PRICE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                          </select>
                          {isAiUnconfirmed('estimatedPrice') && (
                            <>
                              <button type="button" onClick={() => confirmField('estimatedPrice')} aria-label="Accept AI suggestion for estimated price" className="flex-shrink-0 w-6 h-7 flex items-center justify-center text-blue-500 hover:text-blue-700 font-bold text-sm">✓</button>
                              <button type="button" onClick={() => rejectField('estimatedPrice')} aria-label="Reject AI suggestion for estimated price" className="flex-shrink-0 w-6 h-7 flex items-center justify-center text-red-500 hover:text-red-700 font-bold text-sm">✕</button>
                            </>
                          )}
                          {meta.aiIdentified && meta.aiFilledFields.has('estimatedPrice') && meta.aiConfirmedFields['estimatedPrice'] && (
                            <span className="flex-shrink-0 w-7 h-7 flex items-center justify-center text-green-500 text-sm">✓</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                {/* Terms */}
                <label className="flex items-start gap-3 pt-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-line-strong accent-ink flex-shrink-0"
                  />
                  <span className="text-xs text-muted leading-relaxed">
                    I confirm I own the rights to this photo and grant Watchems a non-exclusive licence to display it on the website. The photo is not AI-generated and has not been digitally altered to misrepresent the watch.
                  </span>
                </label>
              </div>

            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              multiple
              onChange={handleFileInput}
              className="hidden"
            />

            {/* Sticky submit bar */}
            {hasItems && (
              <div className="sticky bottom-4 z-10">
                <div className="bg-surface border border-line-strong rounded-xl p-4 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-sm text-muted text-center sm:text-left">
                    {readyCount === 0 ? (
                      <span className="text-faint">All photos uploaded</span>
                    ) : !meta.brandName.trim() ? (
                      <span className="text-faint">Enter a brand name to submit</span>
                    ) : !termsAccepted ? (
                      <span className="text-faint">Confirm the terms in the form to submit</span>
                    ) : (
                      <span>
                        <span className="font-semibold text-ink">{readyCount}</span>{' '}
                        photo{readyCount !== 1 ? 's' : ''} of the same watch ready to submit
                      </span>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className={`w-full sm:w-auto px-6 py-3 rounded-lg font-medium transition-colors text-sm ${
                      canSubmit
                        ? 'bg-ink hover:bg-ink-hover text-white cursor-pointer'
                        : 'bg-canvas text-faint cursor-not-allowed'
                    }`}
                  >
                    {isUploading
                      ? 'Uploading...'
                      : readyCount === 1
                      ? 'Submit 1 photo'
                      : `Submit ${readyCount} photos`}
                  </button>
                </div>
              </div>
            )}
          </form>
        )}

        {pendingCrop && (
          <CropModal
            imageSrc={pendingCrop.src}
            onConfirm={handleCropConfirm}
            onCancel={handleCropCancel}
          />
        )}
      </div>
    </main>
  )
}
