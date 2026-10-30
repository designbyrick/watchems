'use client'

import { useState, useRef, useEffect } from 'react'
import { useUser, SignInButton } from '@clerk/nextjs'
import Link from 'next/link'
import { brandPath } from '@/lib/brandSlug'
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
  const [identifyError, setIdentifyError] = useState<'rate_limited' | 'ai_unavailable' | 'failed'>('failed')
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
    setIdentifyError('failed')

    try {
      const formData = new FormData()
      formData.append('photo', file)
      const res = await fetch('/api/photos/identify', { method: 'POST', body: formData })
      if (!res.ok) {
        const body = await res.json().catch(() => null) as { code?: string } | null
        setIdentifyError(
          res.status === 429 ? 'rate_limited' : body?.code === 'ai_unavailable' ? 'ai_unavailable' : 'failed'
        )
        throw new Error('Identification failed')
      }
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
    if (isAiUnconfirmed(field)) return 'border-mark ring-1 ring-mark/25'
    return 'border-line hover:border-line-strong'
  }

  function inputPrClass(field: AiConfirmField) {
    if (!meta.aiIdentified || !meta.aiFilledFields.has(field)) return ''
    return isAiUnconfirmed(field) ? 'pr-[68px]' : 'pr-9'
  }

  function InlineConfirm({ field, suffix }: { field: AiConfirmField; suffix?: string }) {
    if (isAiUnconfirmed(field)) {
      return (
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => confirmField(field)}
            aria-label={`Accept AI suggestion for ${field}`}
            className="w-7 h-7 rounded-full flex items-center justify-center text-ink hover:bg-subtle transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>
          </button>
          <button
            type="button"
            onClick={() => rejectField(field)}
            aria-label={`Reject AI suggestion for ${field}`}
            className="w-7 h-7 rounded-full flex items-center justify-center text-muted hover:text-ink hover:bg-subtle transition-colors"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>
      )
    }
    if (meta.aiIdentified && meta.aiFilledFields.has(field) && meta.aiConfirmedFields[field]) {
      return (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-mark" aria-label="Confirmed">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>
        </span>
      )
    }
    if (suffix) {
      return <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-faint pointer-events-none">{suffix}</span>
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

  // Light step state for the eyebrow: 1 photos → 2 details → 3 submitted
  const step = success ? 3 : hasItems ? 2 : 1
  const stepLabel = ['Photos', 'Details', 'Submitted'][step - 1]

  const MONO_LABEL = 'font-mono text-[11px] tracking-[1px] uppercase text-muted'
  const CARD = 'rounded-[10px] bg-surface border border-line'
  const INPUT = 'w-full h-11 rounded-lg bg-surface border px-3 text-[15px] text-ink placeholder:text-faint transition-colors focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-ink'

  // Called as a function (not <Component/>) so inputs keep focus across renders
  function textField(opts: {
    id: string
    label: React.ReactNode
    metaKey: keyof WatchMeta
    field: AiConfirmField
    placeholder: string
    maxLength?: number
    suffix?: string
    inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
  }) {
    const aiPad = inputPrClass(opts.field)
    return (
      <div className="min-w-0">
        <label htmlFor={opts.id} className="block mb-1.5 text-[13px] font-medium text-ink">{opts.label}</label>
        <div className="relative">
          <input
            id={opts.id}
            type="text"
            inputMode={opts.inputMode}
            value={meta[opts.metaKey] as string}
            onChange={(e) => metaChange(opts.metaKey, e.target.value)}
            placeholder={opts.placeholder}
            maxLength={opts.maxLength}
            className={`${INPUT} ${fieldBorderClass(opts.field)} ${aiPad || (opts.suffix ? 'pr-10' : '')}`}
          />
          <InlineConfirm field={opts.field} suffix={opts.suffix} />
        </div>
      </div>
    )
  }

  function resetIdentify() {
    patchMeta({
      identifyStatus: 'idle', aiIdentified: false,
      aiFilledFields: new Set(), aiConfirmedFields: {},
    })
  }

  if (!isLoaded) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-pulse font-mono text-xs tracking-[1px] uppercase text-faint">Loading…</div>
      </div>
    )
  }

  const priceUnconfirmed = isAiUnconfirmed('estimatedPrice')
  const priceConfirmed = meta.aiIdentified && meta.aiFilledFields.has('estimatedPrice') && !!meta.aiConfirmedFields.estimatedPrice

  return (
    <div className="text-ink">
      <div className="max-w-[1080px] mx-auto px-4 sm:px-8 pt-8 sm:pt-10 pb-16 sm:pb-[72px]">
        <p className="font-mono text-xs tracking-[1px] uppercase text-muted">
          Step {step} of 3 · {stepLabel}
        </p>
        <h1 className="mt-2.5 text-[34px] sm:text-[44px] leading-[1.05] font-semibold tracking-[-1.8px]">
          {success ? (successPreviews.length > 1 ? 'Wrist shots submitted' : 'Wrist shot submitted') : 'Add a wrist shot'}
        </h1>

        {!isSignedIn ? (
          <div className={`${CARD} mt-8 p-6 sm:p-8 max-w-lg`}>
            <p className="text-[15px] text-muted mb-5">Sign in to add your wrist shots to the library.</p>
            <SignInButton mode="modal">
              <button className="h-12 px-6 rounded-full bg-ink hover:bg-ink-hover text-white text-[15px] font-semibold transition-colors w-full sm:w-auto">
                Sign in to upload
              </button>
            </SignInButton>
          </div>
        ) : success ? (
          <div className={`${CARD} mt-8 p-6 sm:p-8 max-w-xl`}>
            {successPreviews.length > 0 && (
              <div className="flex gap-2.5 mb-6 flex-wrap">
                {successPreviews.map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={src} className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg border border-line" alt={`Submitted photo ${i + 1}`} />
                ))}
              </div>
            )}
            <p className="flex items-center gap-2 text-[17px] font-semibold">
              <svg className="w-4 h-4 text-mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>
              In review
            </p>
            <p className="mt-2 text-[15px] text-muted leading-relaxed">
              Your {successPreviews.length > 1 ? 'photos are' : 'photo is'} being reviewed and will be approved soon.
              {meta.brandName && (
                <>
                  {' '}Once approved, {successPreviews.length > 1 ? 'they' : 'it'} will appear on the{' '}
                  <Link
                    href={brandPath(meta.brandName)}
                    className="text-ink underline underline-offset-2 hover:text-muted transition-colors"
                  >
                    {meta.brandName} page
                  </Link>
                  .
                </>
              )}
            </p>

            <p className={`${MONO_LABEL} mt-8 mb-3`}>While you wait</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {[
                { href: '/dashboard', title: 'My Watches', note: 'Your submissions' },
                { href: '/dashboard/wrist-check', title: 'Wrist Check', note: 'Daily wear log' },
                { href: '/dashboard/boards', title: 'Collections', note: 'Save and organise' },
              ].map((l) => (
                <Link key={l.href} href={l.href} className="rounded-lg border border-line px-4 py-3 hover:border-line-strong hover:bg-canvas transition-colors">
                  <span className="block text-[15px] font-semibold">{l.title}</span>
                  <span className="block mt-0.5 text-[13px] text-muted">{l.note}</span>
                </Link>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  setSuccess(false)
                  setItems([])
                  setMeta(defaultMeta())
                  setGlobalError('')
                  setSuccessPreviews([])
                  setPartialSuccess('')
                  filesById.current.clear()
                }}
                className="h-12 px-6 rounded-full bg-ink hover:bg-ink-hover text-white text-[15px] font-semibold transition-colors"
              >
                Add another watch
              </button>
              <Link href="/" className="h-12 px-6 rounded-full border border-line hover:border-line-strong text-ink text-[15px] font-semibold transition-colors flex items-center">
                Back to the gallery
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8">
            {globalError && (
              <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{globalError}</div>
            )}
            {partialSuccess && (
              <div role="status" className="mb-5 rounded-lg border border-line bg-surface px-4 py-3 text-sm text-ink">{partialSuccess}</div>
            )}

            <div className="flex flex-wrap gap-8 items-start">

              {/* ── LEFT: Photos ── */}
              <section
                aria-label="Photos"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className="flex-[1_1_340px] min-w-0 flex flex-col gap-3"
              >
                {hasItems && primaryItem?.preview ? (
                  <div className={`relative rounded-[10px] overflow-hidden bg-surface border ${isDragging ? 'border-ink' : 'border-line'}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={primaryItem.preview} alt="Primary photo" className="block w-full aspect-[4/5] object-cover" />

                    {meta.identifyStatus === 'identifying' && (
                      <div className="absolute inset-0 bg-ink/50 flex items-center justify-center">
                        <div className="text-white text-sm font-medium flex items-center gap-2">
                          <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                          Identifying watch…
                        </div>
                      </div>
                    )}

                    <span className="absolute left-3 top-3 h-7 rounded-full bg-ink/80 text-white flex items-center px-2.5 font-mono text-[11px] tracking-[1px] uppercase">
                      Primary
                    </span>

                    <button
                      type="button"
                      onClick={() => setPendingCrop({ src: primaryItem.preview, file: primaryItem.file, id: primaryItem.id })}
                      aria-label="Crop photo"
                      className="absolute right-3 bottom-3 h-10 rounded-full bg-white/95 hover:bg-white text-ink flex items-center gap-1.5 px-3.5 text-sm font-semibold shadow-sm transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 2v14a2 2 0 0 0 2 2h14M18 22V8a2 2 0 0 0-2-2H2" /></svg>
                      Crop
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className={`w-full aspect-[4/5] rounded-[10px] border-[1.5px] border-dashed bg-surface flex flex-col items-center justify-center gap-3 px-6 text-center transition-colors ${
                      isDragging ? 'border-ink' : 'border-line-strong hover:border-ink'
                    }`}
                  >
                    {hasItems ? (
                      <span className="text-sm text-muted flex items-center gap-2">
                        <span className="animate-spin inline-block w-4 h-4 border-2 border-faint border-t-transparent rounded-full" />
                        Processing…
                      </span>
                    ) : (
                      <>
                        <span className="w-12 h-12 rounded-full bg-ink text-white flex items-center justify-center">
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
                        </span>
                        <span className="text-[17px] font-semibold">{isDragging ? 'Drop your photos here' : 'Add photos'}</span>
                        <span className="text-[13px] text-muted">Drag and drop or click · JPEG, PNG, WebP up to 20MB each</span>
                      </>
                    )}
                  </button>
                )}

                {hasItems && (
                  <div className="grid grid-cols-4 gap-2.5">
                    {items.map((item, i) => (
                      <div key={item.id} className="relative group">
                        <div
                          onClick={() => { if (i > 0 && item.status !== 'uploading') setPrimary(item.id) }}
                          title={i > 0 && item.status === 'ready' ? 'Set as primary' : undefined}
                          className={`relative aspect-square rounded-lg overflow-hidden bg-subtle border-2 ${
                            i === 0
                              ? 'border-ink'
                              : item.status !== 'uploading'
                              ? 'border-transparent cursor-pointer hover:border-line-strong'
                              : 'border-transparent'
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
                            <div className="absolute inset-0 bg-ink/50 flex items-center justify-center">
                              <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                            </div>
                          )}
                          {item.status === 'done' && (
                            <div className="absolute inset-0 bg-ink/50 flex items-center justify-center text-white">
                              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-label="Uploaded"><path d="m5 12 5 5 9-10" /></svg>
                            </div>
                          )}
                          {item.status === 'error' && (
                            <div className="absolute inset-0 bg-ink/60 flex items-center justify-center">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); retryUpload(item.id) }}
                                className="h-7 px-2.5 rounded-full bg-white text-ink text-xs font-semibold"
                                title={item.errorMessage || 'Retry upload'}
                              >
                                Retry
                              </button>
                            </div>
                          )}
                          {i > 0 && item.status === 'ready' && (
                            <span className="absolute inset-x-0 bottom-0 py-1 bg-ink/70 text-white text-center font-mono text-[9px] tracking-[0.5px] uppercase opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                              Set primary
                            </span>
                          )}
                        </div>

                        {item.status !== 'uploading' && item.status !== 'done' && (
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="absolute top-1 right-1 w-7 h-7 rounded-full bg-ink/80 hover:bg-ink text-white flex items-center justify-center transition-colors"
                            aria-label="Remove photo"
                          >
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
                          </button>
                        )}
                      </div>
                    ))}

                    {!atMax && (
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className={`aspect-square rounded-lg border-[1.5px] border-dashed bg-surface flex items-center justify-center transition-colors ${
                          isDragging ? 'border-ink text-ink' : 'border-line-strong text-muted hover:border-ink hover:text-ink'
                        }`}
                        aria-label="Add more photos"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
                      </button>
                    )}
                  </div>
                )}

                <p className="text-[13px] leading-normal text-muted">
                  Up to {MAX_PHOTOS} photos{hasItems ? ` (${items.length} added)` : ''}. The first one is used to identify the watch.
                  {' '}GPS location, camera info and all EXIF metadata are removed automatically.
                </p>
              </section>

              {/* ── RIGHT: Watch details ── */}
              <section aria-label="Watch details" className="flex-[1.4_1_460px] min-w-0 flex flex-col gap-5">

                {meta.isWatch === false && (
                  <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    This doesn&apos;t look like a watch photo. You can still submit if the AI is incorrect.
                  </div>
                )}
                {meta.aiGenerated === true && (
                  <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    This photo may be AI-generated. AI images won&apos;t be approved.
                  </div>
                )}

                {/* Identity card */}
                <div className={`${CARD} overflow-hidden`}>
                  <div className="flex items-center gap-2.5 px-[18px] py-3.5 border-b border-line min-h-[52px]">
                    {meta.identifyStatus === 'done' && <span className="w-2 h-2 rounded-full bg-mark shrink-0" aria-hidden="true" />}
                    {meta.identifyStatus === 'identifying' && (
                      <span className="animate-spin inline-block w-3 h-3 border-2 border-ink border-t-transparent rounded-full shrink-0" aria-hidden="true" />
                    )}
                    <span className="flex-1 font-mono text-xs tracking-[1px] uppercase">
                      {meta.identifyStatus === 'done'
                        ? 'Watch identified from primary photo'
                        : meta.identifyStatus === 'identifying'
                        ? 'Identifying watch…'
                        : meta.identifyStatus === 'error'
                        ? identifyError === 'rate_limited'
                          ? 'Too many attempts'
                          : identifyError === 'ai_unavailable'
                          ? 'AI unavailable'
                          : 'Identification failed'
                        : 'Watch'}
                    </span>
                    {primaryItem && meta.identifyStatus === 'idle' && (
                      <button
                        type="button"
                        onClick={() => identifyPrimary(primaryItem.id)}
                        className="h-9 -my-1 px-3.5 rounded-full bg-ink hover:bg-ink-hover text-white text-[13px] font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                        </svg>
                        Auto-fill with AI
                      </button>
                    )}
                    {primaryItem && (meta.identifyStatus === 'done' || meta.identifyStatus === 'error') && (
                      <button
                        type="button"
                        onClick={resetIdentify}
                        className="text-[13px] font-medium text-muted hover:text-ink underline underline-offset-2 transition-colors"
                      >
                        {meta.identifyStatus === 'error' ? 'Try again' : 'Re-identify'}
                      </button>
                    )}
                  </div>
                  <div className="p-[18px] grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3.5">
                    {textField({ id: 'u-brand', label: <>Brand <span className="text-mark" aria-hidden="true">*</span></>, metaKey: 'brandName', field: 'brand', placeholder: 'e.g. Rolex', maxLength: 80 })}
                    {textField({ id: 'u-model', label: <>Model <span className="text-mark" aria-hidden="true">*</span></>, metaKey: 'modelName', field: 'model', placeholder: 'e.g. Submariner', maxLength: 100 })}
                    {textField({ id: 'u-ref', label: 'Reference', metaKey: 'referenceNumber', field: 'reference', placeholder: 'e.g. 126610LN', maxLength: 60 })}
                    {textField({ id: 'u-mov', label: 'Movement', metaKey: 'movement', field: 'movement', placeholder: 'e.g. Automatic', maxLength: 60 })}
                  </div>
                  <div className="px-[18px] pb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[13px] text-muted">
                    <span>
                      {meta.identifyStatus === 'error'
                        ? identifyError === 'rate_limited'
                          ? 'Too many AI attempts. Try again in an hour, or fill in the details manually.'
                          : identifyError === 'ai_unavailable'
                          ? 'AI identification is temporarily unavailable. Fill in the details manually.'
                          : 'Fill in the details manually.'
                        : meta.aiIdentified && aiFilledCount > 0
                        ? 'Check and correct anything the AI got wrong before submitting. Highlighted fields need a ✓ or ✕.'
                        : hasItems
                        ? 'Brand is required. Auto-fill with AI or type the details yourself.'
                        : 'Brand is required. Add a photo first to auto-fill the rest with AI.'}
                    </span>
                    {meta.aiIdentified && aiFilledCount > 0 && (
                      <span className="font-mono text-[11px] tracking-[1px] uppercase tabular-nums">
                        {aiConfirmedCount}/{aiFilledCount} checked
                      </span>
                    )}
                  </div>
                </div>

                {/* Dimensions */}
                <fieldset className={`${CARD} m-0 p-[18px] min-w-0`}>
                  <legend className="px-1.5 font-mono text-xs tracking-[1px] uppercase text-muted">Dimensions</legend>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {textField({ id: 'u-case', label: 'Case', metaKey: 'caseSize', field: 'caseSize', placeholder: '40', maxLength: 20, suffix: 'mm', inputMode: 'decimal' })}
                    {textField({ id: 'u-lug', label: 'Lug width', metaKey: 'betweenLugs', field: 'betweenLugs', placeholder: '20', maxLength: 20, suffix: 'mm', inputMode: 'decimal' })}
                    {textField({ id: 'u-l2l', label: 'Lug-to-lug', metaKey: 'lugToLug', field: 'lugToLug', placeholder: '47', maxLength: 20, suffix: 'mm', inputMode: 'decimal' })}
                    {textField({ id: 'u-thk', label: 'Thickness', metaKey: 'thickness', field: 'thickness', placeholder: '12', maxLength: 20, suffix: 'mm', inputMode: 'decimal' })}
                  </div>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {textField({ id: 'u-wr', label: 'Water resistance', metaKey: 'waterResistance', field: 'waterResistance', placeholder: 'e.g. 300m / 1000ft', maxLength: 40 })}
                    {textField({ id: 'u-wrist', label: 'Your wrist size', metaKey: 'wristSize', field: 'wristSize', placeholder: 'e.g. 7.25" or 17 cm', inputMode: 'decimal' })}
                  </div>
                </fieldset>

                {/* Estimated price */}
                <div className={`${CARD} px-[18px] py-4 flex flex-wrap items-center gap-3.5 ${priceUnconfirmed ? 'border-mark ring-1 ring-mark/25' : ''}`}>
                  <div className="flex-1 min-w-[200px]">
                    <label htmlFor="u-price" className={MONO_LABEL}>
                      {meta.aiFilledFields.has('estimatedPrice') && meta.aiIdentified ? 'AI suggestion · Estimated price' : 'Estimated price'}
                    </label>
                    <select
                      id="u-price"
                      value={meta.estimatedPrice}
                      onChange={(e) => metaChange('estimatedPrice', e.target.value)}
                      className="mt-1 -ml-1 block max-w-full bg-transparent text-[17px] font-semibold text-ink rounded-md px-1 py-0.5 cursor-pointer hover:bg-subtle focus:outline focus:outline-2 focus:outline-ink"
                    >
                      <option value="">Select a range…</option>
                      {ESTIMATED_PRICE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  {priceUnconfirmed && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => rejectField('estimatedPrice')}
                        aria-label="Reject AI suggestion for estimated price"
                        className="h-11 px-4 rounded-full border border-line hover:border-line-strong text-ink text-sm font-semibold transition-colors"
                      >
                        Not right
                      </button>
                      <button
                        type="button"
                        onClick={() => confirmField('estimatedPrice')}
                        aria-label="Accept AI suggestion for estimated price"
                        className="h-11 px-4 rounded-full bg-ink hover:bg-ink-hover text-white text-sm font-semibold transition-colors"
                      >
                        Looks right
                      </button>
                    </div>
                  )}
                  {priceConfirmed && (
                    <span className="flex items-center gap-1.5 text-sm font-semibold">
                      <svg className="w-4 h-4 text-mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>
                      Confirmed
                    </span>
                  )}
                </div>

                {/* Terms */}
                <label className="flex items-start gap-2.5 text-sm leading-normal cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-px w-5 h-5 shrink-0 accent-ink"
                  />
                  <span className="text-muted">
                    I confirm I own the rights to this photo and grant Watchems a non-exclusive licence to display it on the website. The photo is not AI-generated and has not been digitally altered to misrepresent the watch.{' '}
                    <Link href="/terms" target="_blank" className="text-ink underline underline-offset-2 hover:text-muted transition-colors">Terms</Link>
                  </span>
                </label>

                {/* Submit */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className={`h-[52px] px-7 rounded-full text-base font-semibold transition-colors ${
                      canSubmit ? 'bg-ink hover:bg-ink-hover text-white' : 'bg-line text-muted cursor-not-allowed'
                    }`}
                  >
                    {isUploading
                      ? 'Uploading…'
                      : readyCount > 1
                      ? `Submit ${readyCount} photos for review`
                      : 'Submit for review'}
                  </button>
                  <span className="text-[13px] text-muted">
                    {!hasItems
                      ? 'Add at least one photo to submit'
                      : readyCount === 0
                      ? 'All photos uploaded'
                      : !meta.brandName.trim()
                      ? 'Enter a brand name to submit'
                      : !termsAccepted
                      ? 'Confirm the terms to submit'
                      : 'Photos are reviewed before they go live.'}
                  </span>
                </div>
              </section>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              multiple
              onChange={handleFileInput}
              className="hidden"
            />
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
    </div>
  )
}
