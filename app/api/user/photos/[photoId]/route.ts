import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { photos, photoLikes, collectionItems } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { sanitizeText } from '@/lib/validation'

export const dynamic = 'force-dynamic'

const MAX_FIELD_LENGTH = 120

/** Fields that define which watch the photo shows — editing them requires re-review. */
const IDENTITY_KEYS = ['brandName', 'modelName', 'referenceNumber'] as const

/** DELETE /api/user/photos/[photoId] — delete the user's own photo */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ photoId: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { photoId } = await params
  if (!photoId) return NextResponse.json({ error: 'Missing photoId' }, { status: 400 })

  try {
    const existing = await db
      .select({
        id: photos.id,
        url: photos.url,
        thumbnailUrl: photos.thumbnailUrl,
        originalUrl: photos.originalUrl,
      })
      .from(photos)
      .where(and(eq(photos.id, photoId), eq(photos.userId, userId)))
      .limit(1)

    if (!existing || existing.length === 0) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
    }

    await db.delete(photos).where(eq(photos.id, photoId))
    // No FKs on these tables — clear rows that would otherwise point at a missing photo
    await db.delete(photoLikes).where(eq(photoLikes.photoId, photoId))
    await db.delete(collectionItems).where(eq(collectionItems.photoId, photoId))

    // Remove the image files too, so "delete" actually deletes the user's photo.
    // Best effort: a storage failure must not undo the DB deletion.
    const { isR2Configured, deletePhotoFromR2 } = await import('@/lib/r2')
    if (isR2Configured) {
      const { url, thumbnailUrl, originalUrl } = existing[0]
      const urls = Array.from(new Set([url, thumbnailUrl, originalUrl].filter((u): u is string => !!u)))
      await Promise.all(urls.map((u) => deletePhotoFromR2(u)))
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting photo:', error)
    return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 })
  }
}

/** PATCH /api/user/photos/[photoId] — update metadata fields on the user's own photo */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ photoId: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { photoId } = await params

  if (!photoId) {
    return NextResponse.json({ error: 'Missing photoId' }, { status: 400 })
  }

  const body = (await req.json()) as { fields: Record<string, string | undefined> }
  const { fields } = body

  if (!fields || typeof fields !== 'object') {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Allowlist of editable columns
  const allowedKeys = new Set([
    'brandName',
    'modelName',
    'referenceNumber',
    'movement',
    'caseSize',
    'wristSize',
    'estimatedPrice',
    'lugToLug',
    'betweenLugs',
    'thickness',
    'waterResistance',
  ])

  const updates: Record<string, string> = {}
  for (const [key, value] of Object.entries(fields)) {
    if (allowedKeys.has(key) && typeof value === 'string') {
      const clean = sanitizeText(value, MAX_FIELD_LENGTH)
      if (/[<>]/.test(clean)) {
        return NextResponse.json({ error: `Invalid characters in ${key}` }, { status: 400 })
      }
      updates[key] = clean
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  try {
    // Verify the photo belongs to this user
    const existing = await db
      .select({
        id: photos.id,
        status: photos.status,
        brandName: photos.brandName,
        modelName: photos.modelName,
        referenceNumber: photos.referenceNumber,
      })
      .from(photos)
      .where(and(eq(photos.id, photoId), eq(photos.userId, userId)))
      .limit(1)

    if (!existing || existing.length === 0) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
    }

    // Changing what the photo claims to be on an approved photo sends it back
    // to the moderation queue — otherwise approval could be bypassed by editing
    // the metadata after the fact.
    const current = existing[0]
    const identityChanged = IDENTITY_KEYS.some(
      (key) => key in updates && (updates[key] || null) !== (current[key] || null)
    )
    const requeue = current.status === 'approved' && identityChanged

    await db
      .update(photos)
      .set(requeue ? { ...updates, status: 'pending' } : updates)
      .where(eq(photos.id, photoId))

    return NextResponse.json({ success: true, status: requeue ? 'pending_review' : current.status })
  } catch (error) {
    console.error('Error updating photo metadata:', error)
    return NextResponse.json({ error: 'Failed to update photo' }, { status: 500 })
  }
}
