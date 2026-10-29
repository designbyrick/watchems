import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import sharp from 'sharp'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import type { ApprovedPhoto } from '@/lib/photos'
import { ACCEPTED_TYPES } from '@/lib/photos'
import { generatePhotoSlug } from '@/lib/generatePhotoSlug'

export const dynamic = 'force-dynamic'
import { isValidSlug, sanitizeText } from '@/lib/validation'
import { checkRateLimit } from '@/lib/ratelimit'
import { db } from '@/lib/db'
import { photos } from '@/lib/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { normalizeWatch } from '@/lib/normalizeWatch'

function auditLog(event: string, data: Record<string, unknown>) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), event, ...data }))
}

/** Reads an optional metadata field: trimmed, length-capped, with angle brackets stripped. */
function metaField(formData: FormData, key: string): string | null {
  const value = formData.get(key)
  if (typeof value !== 'string') return null
  return sanitizeText(value.replace(/[<>]/g, ''), 120) || null
}

function validateMagicBytes(buf: Buffer): boolean {
  // JPEG
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true
  // PNG
  if (buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true
  // WebP
  if (buf.length >= 12 && buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return true
  // AVIF — ISOBMFF ftyp box: bytes 4–7 = 'ftyp', bytes 8–11 = 'avif' or 'avis'
  if (buf.length >= 12 &&
      buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70 &&
      ((buf[8] === 0x61 && buf[9] === 0x76 && buf[10] === 0x69 && buf[11] === 0x66) ||
       (buf[8] === 0x61 && buf[9] === 0x76 && buf[10] === 0x69 && buf[11] === 0x73))) return true
  return false
}

/** GET /api/photos/[watchId] — fetch approved photos */
export async function GET(_req: NextRequest, props: { params: Promise<{ watchId: string }> }) {
  const params = await props.params;
  if (!isValidSlug(params.watchId)) {
    return NextResponse.json([], { status: 400 })
  }

  try {
    const photoRecords = await db
      .select()
      .from(photos)
      .where(and(eq(photos.watchId, params.watchId), eq(photos.status, 'approved')))

    const approved: ApprovedPhoto[] = photoRecords.map((p) => ({
      id: p.id,
      watchId: p.watchId,
      userId: p.userId,
      userName: p.userName,
      url: p.url,
      brandName: p.brandName ?? undefined,
      modelName: p.modelName ?? undefined,
      referenceNumber: p.referenceNumber ?? undefined,
      movement: p.movement ?? undefined,
      caseSize: p.caseSize ?? undefined,
      wristSize: p.wristSize ?? undefined,
      estimatedPrice: p.estimatedPrice ?? undefined,
      lugToLug: p.lugToLug ?? undefined,
      betweenLugs: p.betweenLugs ?? undefined,
      thickness: p.thickness ?? undefined,
      waterResistance: p.waterResistance ?? undefined,
      approved: true,
      createdAt: p.createdAt.toISOString(),
    }))

    return NextResponse.json(approved)
  } catch (error) {
    console.error('Error fetching photos:', error)
    return NextResponse.json([])
  }
}

/** POST /api/photos/[watchId] — upload a photo (requires auth) */
export async function POST(req: NextRequest, props: { params: Promise<{ watchId: string }> }) {
  const params = await props.params;
  if (!isValidSlug(params.watchId)) {
    return NextResponse.json({ error: 'Invalid watch ID' }, { status: 400 })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? 'unknown'

  const { userId } = await auth()
  if (!userId) {
    auditLog('upload.auth_rejected', { ip, watchId: params.watchId })
    return NextResponse.json({ error: 'Sign in to submit photos' }, { status: 401 })
  }

  const { success } = await checkRateLimit(userId)
  if (!success) {
    auditLog('upload.rate_limited', { userId, ip })
    return NextResponse.json({ error: 'Too many submissions. Try again later.' }, { status: 429 })
  }

  const user = await currentUser()
  const firstName = user?.firstName?.trim()
  const lastName = user?.lastName?.trim()
  const username = user?.username?.trim()
  const email = user?.emailAddresses?.[0]?.emailAddress
  const userName = firstName
    ? `${firstName}${lastName ? ' ' + lastName.charAt(0) + '.' : ''}`
    : username
      ? username
      : email
        ? email.split('@')[0]
        : 'Anonymous'

  const formData = await req.formData()
  const file = formData.get('photo') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No photo provided' }, { status: 400 })
  }

  if (!ACCEPTED_TYPES.includes(file.type)) {
    auditLog('upload.validation_failed', { reason: 'mime_type', userId, ip, mime: file.type })
    return NextResponse.json({ error: 'Only JPEG, PNG, and WebP images are accepted' }, { status: 400 })
  }

  // Server-side safety check (8 MB limit, after client-side compression should be much smaller)
  if (file.size > 8 * 1024 * 1024) {
    auditLog('upload.validation_failed', { reason: 'file_too_large', userId, ip, size: file.size })
    return NextResponse.json({ error: 'Photo must be under 8 MB after compression' }, { status: 400 })
  }

  const rawBuffer = Buffer.from(await file.arrayBuffer())

  if (!validateMagicBytes(rawBuffer)) {
    auditLog('upload.validation_failed', { reason: 'invalid_magic_bytes', userId, ip, size: file.size, mime: file.type })
    return NextResponse.json({ error: 'Invalid image file' }, { status: 400 })
  }

  let cleanBuffer: Buffer
  let thumbBuffer: Buffer
  try {
    const rotated = sharp(rawBuffer).rotate()
    cleanBuffer = await rotated
      .clone()
      .resize(2400, 2400, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer()
    thumbBuffer = await rotated
      .clone()
      .resize(600, 600, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 75 })
      .toBuffer()
  } catch {
    auditLog('upload.validation_failed', { reason: 'sharp_decode', userId, ip, size: file.size })
    return NextResponse.json({ error: 'Invalid image file' }, { status: 400 })
  }

  const photoId = crypto.randomUUID()
  let photoUrl: string

  // Read metadata fields from formData early (needed for dedup)
  const wristSize = metaField(formData, 'wristSize')
  const rawBrandName = metaField(formData, 'brandName')
  const rawModelName = metaField(formData, 'modelName')

  // Normalize brand + model server-side — fixes casing, diacritics, brand-in-model,
  // and derives a canonical watchId regardless of what the client sent.
  const normalized = (rawBrandName?.trim() && rawModelName?.trim())
    ? normalizeWatch(rawBrandName.trim(), rawModelName.trim())
    : null
  const brandName = normalized?.brand ?? rawBrandName
  const modelName = normalized?.model ?? rawModelName
  const canonicalWatchId = normalized?.watchId ?? params.watchId

  // Resolve watchId:
  // 1. If this user already has a photo for this brand+model, reuse their watchId
  //    (groups multi-angle shots from the same user under one card).
  // 2. Otherwise, if the canonical watchId already has photos from OTHER users, generate a
  //    user-scoped watchId so this user gets their own separate card.
  // 3. Otherwise use the canonical watchId (first-ever submission for this watch).
  let effectiveWatchId = canonicalWatchId
  try {
    // Step 1: same-user dedup
    if (brandName?.trim() && modelName?.trim()) {
      const sameUserExisting = await db
        .select({ watchId: photos.watchId })
        .from(photos)
        .where(
          and(
            eq(photos.userId, userId),
            sql`LOWER(TRIM(${photos.brandName})) = LOWER(TRIM(${brandName}))`,
            sql`LOWER(TRIM(${photos.modelName})) = LOWER(TRIM(${modelName}))`
          )
        )
        .limit(1)

      if (sameUserExisting.length > 0) {
        // User has uploaded this watch before — add to their existing card
        effectiveWatchId = sameUserExisting[0].watchId
      } else {
        // Step 2: check if the canonical watchId is already taken by another user
        const otherUserPhoto = await db
          .select({ userId: photos.userId })
          .from(photos)
          .where(
            and(
              eq(photos.watchId, canonicalWatchId),
              sql`${photos.userId} != ${userId}`
            )
          )
          .limit(1)

        if (otherUserPhoto.length > 0) {
          // Slug is owned by another user — create a user-scoped watchId
          // Use a 6-char hash of the userId for a stable, short suffix
          const userHash = crypto.createHash('sha256').update(userId).digest('hex').slice(0, 6)
          effectiveWatchId = `${canonicalWatchId}-${userHash}`
        }
        // else: params.watchId is unclaimed — use it as-is
      }
    }
  } catch {
    // query failed — fall back to URL param watchId
  }

  let thumbnailUrl: string | null = null
  const { isR2Configured } = await import('@/lib/r2')
  if (isR2Configured) {
    try {
      const { uploadPhotoToR2, uploadThumbnailToR2 } = await import('@/lib/r2')
      ;[photoUrl, thumbnailUrl] = await Promise.all([
        uploadPhotoToR2(effectiveWatchId, photoId, cleanBuffer),
        uploadThumbnailToR2(effectiveWatchId, photoId, thumbBuffer),
      ])
    } catch (error) {
      auditLog('upload.storage_failed', { userId, ip, photoId, error: String(error) })
      return NextResponse.json({ error: 'Storage unavailable. Please try again later.' }, { status: 503 })
    }
  } else {
    console.warn('[upload] R2 not configured — using local filesystem fallback (dev only)')
    const dir = path.join(process.cwd(), 'public', 'images', 'user-uploads', effectiveWatchId)
    fs.mkdirSync(dir, { recursive: true })
    const localFilename = `${photoId}.webp`
    const thumbFilename = `${photoId}.thumb.webp`
    fs.writeFileSync(path.join(dir, localFilename), cleanBuffer)
    fs.writeFileSync(path.join(dir, thumbFilename), thumbBuffer)
    photoUrl = `/images/user-uploads/${effectiveWatchId}/${localFilename}`
    thumbnailUrl = `/images/user-uploads/${effectiveWatchId}/${thumbFilename}`
  }

  const referenceNumber = metaField(formData, 'referenceNumber')
  const movement = metaField(formData, 'movement')
  const caseSize = metaField(formData, 'caseSize')
  const estimatedPrice = metaField(formData, 'estimatedPrice')
  const lugToLug = metaField(formData, 'lugToLug')
  const betweenLugs = metaField(formData, 'betweenLugs')
  const thickness = metaField(formData, 'thickness')
  const waterResistance = metaField(formData, 'waterResistance')
  // AI-detected visual characteristics (hidden from user)
  const dialColor = metaField(formData, 'dialColor')
  const bezelColor = metaField(formData, 'bezelColor')
  const caseMaterial = metaField(formData, 'caseMaterial')
  const strapType = metaField(formData, 'strapType')
  const watchStyle = metaField(formData, 'watchStyle')

  try {
    await db.insert(photos).values({
      id: photoId,
      watchId: effectiveWatchId,
      userId,
      userName: sanitizeText(userName, 50),
      url: photoUrl,
      thumbnailUrl: thumbnailUrl ?? undefined,
      slug: generatePhotoSlug(brandName, modelName, effectiveWatchId, photoId),
      brandName: brandName || undefined,
      modelName: modelName || undefined,
      referenceNumber: referenceNumber || undefined,
      movement: movement || undefined,
      caseSize: caseSize || undefined,
      wristSize: wristSize || undefined,
      estimatedPrice: estimatedPrice || undefined,
      lugToLug: lugToLug || undefined,
      betweenLugs: betweenLugs || undefined,
      thickness: thickness || undefined,
      waterResistance: waterResistance || undefined,
      dialColor: dialColor || undefined,
      bezelColor: bezelColor || undefined,
      caseMaterial: caseMaterial || undefined,
      strapType: strapType || undefined,
      watchStyle: watchStyle || undefined,
      status: 'pending',
      createdAt: new Date(),
    })
  } catch (error) {
    auditLog('upload.db_failed', { userId, ip, photoId, error: String(error) })
    return NextResponse.json({ error: 'Failed to save photo' }, { status: 500 })
  }

  auditLog('upload.success', { userId, ip, photoId, watchId: effectiveWatchId, size: file.size })
  return NextResponse.json({ success: true, status: 'pending_review' }, { status: 201 })
}
