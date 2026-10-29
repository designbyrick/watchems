import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import fs from 'fs'
import path from 'path'
import { isValidSlug } from '@/lib/validation'
import { checkAdmin } from '@/lib/admin'
import { db } from '@/lib/db'
import { photos, photoLikes, collectionItems } from '@/lib/db/schema'
import { eq, and, sql, inArray } from 'drizzle-orm'
import { sendPhotoApprovedEmail, sendPhotoBulkApprovedEmail, sendPhotoRejectedEmail } from '@/lib/email'
import { REJECTION_REASONS } from '@/lib/rejectionReasons'

export const dynamic = 'force-dynamic'

/** Group photo records by watchId, returning one entry per watch with the first photo's image */
function groupPhotosByWatch(records: { watchId: string; brandName: string | null; modelName: string | null; referenceNumber: string | null; slug: string | null; thumbnailUrl: string | null; url: string; sortOrder: number }[]) {
  const map = new Map<string, { brandName?: string; modelName?: string; referenceNumber?: string; slug?: string; imageUrl?: string; photoCount: number }>()
  // Sort by sortOrder so the first photo (sortOrder 0) is used as the thumbnail
  const sorted = [...records].sort((a, b) => a.sortOrder - b.sortOrder)
  for (const p of sorted) {
    if (!map.has(p.watchId)) {
      map.set(p.watchId, {
        brandName: p.brandName ?? undefined,
        modelName: p.modelName ?? undefined,
        referenceNumber: p.referenceNumber ?? undefined,
        slug: p.slug ?? undefined,
        imageUrl: p.thumbnailUrl ?? p.url,
        photoCount: 1,
      })
    } else {
      map.get(p.watchId)!.photoCount++
    }
  }
  return Array.from(map.values())
}

/** GET /api/admin/photos - list pending or approved photos (?status=pending|approved) */
export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!checkAdmin(userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const statusParam = req.nextUrl.searchParams.get('status')
  const status = statusParam === 'approved' ? 'approved' : statusParam === 'rejected' ? 'rejected' : 'pending'

  try {
    const rows = await db
      .select()
      .from(photos)
      .where(eq(photos.status, status))
      .orderBy((p) => p.createdAt)

    // For approved photos, fetch engagement counts in one query each
    let likeCounts: Record<string, number> = {}
    let saveCounts: Record<string, number> = {}

    if (rows.length > 0) {
      const photoIds = rows.map((p) => p.id)

      const likeRows = await db
        .select({ photoId: photoLikes.photoId, count: sql<number>`count(*)` })
        .from(photoLikes)
        .where(inArray(photoLikes.photoId, photoIds))
        .groupBy(photoLikes.photoId)

      const saveRows = await db
        .select({ photoId: collectionItems.photoId, count: sql<number>`count(*)` })
        .from(collectionItems)
        .where(inArray(collectionItems.photoId, photoIds))
        .groupBy(collectionItems.photoId)

      likeCounts = Object.fromEntries(likeRows.map((r) => [r.photoId, Number(r.count)]))
      saveCounts = Object.fromEntries(saveRows.map((r) => [r.photoId, Number(r.count)]))
    }

    const result = rows.map((p) => ({
      id: p.id,
      watchId: p.watchId,
      userId: p.userId,
      userName: p.userName,
      url: p.url,
      brandName: p.brandName,
      modelName: p.modelName,
      referenceNumber: p.referenceNumber,
      movement: p.movement,
      caseSize: p.caseSize,
      wristSize: p.wristSize,
      estimatedPrice: p.estimatedPrice,
      lugToLug: p.lugToLug,
      betweenLugs: p.betweenLugs,
      thickness: p.thickness,
      waterResistance: p.waterResistance,
      dialColor: p.dialColor,
      bezelColor: p.bezelColor,
      caseMaterial: p.caseMaterial,
      strapType: p.strapType,
      watchStyle: p.watchStyle,
      sortOrder: p.sortOrder,
      originalUrl: p.originalUrl ?? null,
      createdAt: p.createdAt.toISOString(),
      approved: status === 'approved',
      likeCount: likeCounts[p.id] ?? 0,
      saveCount: saveCounts[p.id] ?? 0,
      rejectionReason: p.rejectionReason ?? null,
    }))

    // Sort by sortOrder asc, then createdAt descending
    result.sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching photos:', error)
    return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 })
  }
}

/** POST /api/admin/photos - approve or delete a pending photo */
export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!checkAdmin(userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: { action: 'approve' | 'bulk-approve' | 'user-approve' | 'delete' | 'reject' | 'delete-approved' | 'restore' | 'delete-pending'; watchId: string; photoId: string; photoIds?: string[]; submitterUserId?: string; rejectionReasonId?: string; rejectionNote?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const { action, watchId, photoId, photoIds, submitterUserId, rejectionReasonId, rejectionNote } = body

  if (!['approve', 'bulk-approve', 'user-approve', 'delete', 'reject', 'delete-approved', 'restore', 'delete-pending'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  // bulk-approve: all photos for a single watchId, one summary email
  if (action === 'bulk-approve') {
    if (!watchId || !isValidSlug(watchId)) return NextResponse.json({ error: 'Invalid watch ID' }, { status: 400 })
    if (!Array.isArray(photoIds) || photoIds.length === 0) return NextResponse.json({ error: 'Missing photoIds' }, { status: 400 })

    try {
      const photoRecords = await db
        .select()
        .from(photos)
        .where(and(inArray(photos.id, photoIds), eq(photos.status, 'pending')))

      if (photoRecords.length === 0) return NextResponse.json({ error: 'No pending photos found' }, { status: 404 })

      await db.update(photos).set({ status: 'approved' }).where(inArray(photos.id, photoIds))

      const uid = photoRecords[0]?.userId
      if (uid) {
        try {
          const clerk = await clerkClient()
          const user = await clerk.users.getUser(uid)
          const email = user.emailAddresses?.[0]?.emailAddress
          if (email) {
            await sendPhotoBulkApprovedEmail(email, {
              firstName: user.firstName ?? undefined,
              photos: groupPhotosByWatch(photoRecords),
            })
          }
        } catch (emailError) {
          console.error('[Resend] Failed to send bulk approval email:', emailError)
        }
      }

      return NextResponse.json({ success: true, approved: photoRecords.length })
    } catch (error) {
      console.error('Error bulk-approving photos:', error)
      return NextResponse.json({ error: 'Failed to bulk approve photos' }, { status: 500 })
    }
  }

  // user-approve: approve ALL pending photos for a user across multiple watches, one email
  if (action === 'user-approve') {
    if (!submitterUserId) return NextResponse.json({ error: 'Missing submitterUserId' }, { status: 400 })
    if (!Array.isArray(photoIds) || photoIds.length === 0) return NextResponse.json({ error: 'Missing photoIds' }, { status: 400 })

    try {
      const photoRecords = await db
        .select()
        .from(photos)
        .where(and(inArray(photos.id, photoIds), eq(photos.userId, submitterUserId), eq(photos.status, 'pending')))

      if (photoRecords.length === 0) return NextResponse.json({ error: 'No pending photos found' }, { status: 404 })

      await db.update(photos).set({ status: 'approved' }).where(inArray(photos.id, photoRecords.map((p) => p.id)))

      try {
        const clerk = await clerkClient()
        const user = await clerk.users.getUser(submitterUserId)
        const email = user.emailAddresses?.[0]?.emailAddress
        if (email) {
          await sendPhotoBulkApprovedEmail(email, {
            firstName: user.firstName ?? undefined,
            photos: groupPhotosByWatch(photoRecords),
          })
        }
      } catch (emailError) {
        console.error('[Resend] Failed to send user-approve email:', emailError)
      }

      return NextResponse.json({ success: true, approved: photoRecords.length })
    } catch (error) {
      console.error('Error user-approving photos:', error)
      return NextResponse.json({ error: 'Failed to approve photos' }, { status: 500 })
    }
  }

  if (!action || !watchId || !photoId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (!isValidSlug(watchId)) {
    return NextResponse.json({ error: 'Invalid watch ID' }, { status: 400 })
  }

  try {
    // Find the photo with the expected status based on action
    const expectedStatus =
      action === 'delete-approved' ? 'approved' :
      action === 'restore' ? 'rejected' :
      action === 'delete' ? 'rejected' :
      action === 'delete-pending' ? 'pending' :
      'pending'
    const photo = await db
      .select()
      .from(photos)
      .where(and(eq(photos.id, photoId), eq(photos.status, expectedStatus)))
      .limit(1)

    if (!photo || photo.length === 0) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
    }

    const photoRecord = photo[0]

    if (action === 'approve') {
      // Update photo status to approved
      await db.update(photos).set({ status: 'approved' }).where(eq(photos.id, photoId))

      // Send approval notification email via Resend (non-blocking)
      if (photoRecord.userId) {
        try {
          const clerk = await clerkClient()
          const user = await clerk.users.getUser(photoRecord.userId)
          const email = user.emailAddresses?.[0]?.emailAddress
          if (email) {
            await sendPhotoApprovedEmail(email, {
              firstName: user.firstName ?? undefined,
              brandName: photoRecord.brandName ?? undefined,
              modelName: photoRecord.modelName ?? undefined,
              referenceNumber: photoRecord.referenceNumber ?? undefined,
              slug: photoRecord.slug ?? undefined,
              imageUrl: photoRecord.thumbnailUrl ?? photoRecord.url,
            })
          }
        } catch (emailError) {
          console.error('[Resend] Failed to send approval email:', emailError)
        }
      }
    } else if (action === 'reject') {
      const reason = REJECTION_REASONS.find((r) => r.id === rejectionReasonId)
      const storedReason = reason
        ? rejectionNote
          ? `${reason.label}: ${rejectionNote}`
          : reason.label
        : rejectionNote || null

      await db.update(photos)
        .set({ status: 'rejected', rejectionReason: storedReason })
        .where(eq(photos.id, photoId))

      // Send rejection email (non-blocking)
      if (photoRecord.userId && reason) {
        try {
          const clerk = await clerkClient()
          const user = await clerk.users.getUser(photoRecord.userId)
          const email = user.emailAddresses?.[0]?.emailAddress
          if (email) {
            // Count how many photos the user submitted for this watch (pending + just-rejected)
            const siblingCount = await db
              .select({ count: sql<number>`count(*)::int` })
              .from(photos)
              .where(and(eq(photos.watchId, photoRecord.watchId), eq(photos.userId, photoRecord.userId)))
              .then((r) => Number(r[0]?.count ?? 1))

            await sendPhotoRejectedEmail(email, {
              firstName: user.firstName ?? undefined,
              brandName: photoRecord.brandName ?? undefined,
              modelName: photoRecord.modelName ?? undefined,
              referenceNumber: photoRecord.referenceNumber ?? undefined,
              imageUrl: photoRecord.thumbnailUrl ?? photoRecord.url ?? undefined,
              reasonLabel: reason.label,
              reasonDescription: reason.id !== 'other' ? reason.description : '',
              customNote: rejectionNote,
              photoCount: siblingCount,
            })
          }
        } catch (emailError) {
          console.error('[Resend] Failed to send rejection email:', emailError)
        }
      }
    } else if (action === 'restore') {
      // Restore a rejected photo back to pending
      await db.update(photos).set({ status: 'pending' }).where(eq(photos.id, photoId))
    } else if (action === 'delete') {
      // Delete rejected photo entry only — do NOT remove images from R2
      await db.delete(photos).where(eq(photos.id, photoId))
    } else if (action === 'delete-pending') {
      // Soft-delete pending photo — was never indexed, but keeps row for audit
      await db.update(photos).set({ status: 'deleted' }).where(eq(photos.id, photoId))
    } else if (action === 'delete-approved') {
      // For approved photos, check if this is the last photo
      const approvedPhotoCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(photos)
        .where(and(eq(photos.watchId, watchId), eq(photos.status, 'approved')))
        .then((result) => result[0]?.count || 0)

      if (approvedPhotoCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot delete the last photo - a watch must have at least one photo' },
          { status: 400 }
        )
      }

      // Delete photo from R2 or filesystem
      const url = photoRecord.url
      const thumbUrl = photoRecord.thumbnailUrl
      if (url.startsWith('/images/')) {
        const filePath = path.join(process.cwd(), 'public', url)
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
        }
      } else {
        try {
          const { deletePhotoFromR2, isR2Configured } = await import('@/lib/r2')
          if (isR2Configured) {
            await deletePhotoFromR2(url)
            if (thumbUrl) {
              await deletePhotoFromR2(thumbUrl)
            }
          }
        } catch (error) {
          console.error('Failed to delete from R2:', error)
        }
      }

      // Soft-delete — keeps the row so /photo/[id] can return 410 Gone to Google
      await db.update(photos).set({ status: 'deleted' }).where(eq(photos.id, photoId))
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error processing photo action:', error)
    return NextResponse.json({ error: 'Failed to process photo' }, { status: 500 })
  }
}

/** PATCH /api/admin/photos - update metadata fields on a photo */
export async function PATCH(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!checkAdmin(userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: {
    photoId: string
    fields: Record<string, string | undefined>
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const { photoId, fields } = body

  if (!photoId || !fields || typeof fields !== 'object') {
    return NextResponse.json({ error: 'Missing photoId or fields' }, { status: 400 })
  }

  // Allowlist of editable columns
  const allowedKeys: Record<string, keyof typeof photos> = {
    watchId: 'watchId',
    brandName: 'brandName',
    modelName: 'modelName',
    referenceNumber: 'referenceNumber',
    movement: 'movement',
    caseSize: 'caseSize',
    wristSize: 'wristSize',
    estimatedPrice: 'estimatedPrice',
    lugToLug: 'lugToLug',
    betweenLugs: 'betweenLugs',
    thickness: 'thickness',
    waterResistance: 'waterResistance',
    dialColor: 'dialColor',
    bezelColor: 'bezelColor',
    caseMaterial: 'caseMaterial',
    strapType: 'strapType',
    watchStyle: 'watchStyle',
    slug: 'slug',
  }

  // Build the set object with only allowed, provided fields
  const updates: Record<string, string> = {}
  for (const [key, value] of Object.entries(fields)) {
    if (allowedKeys[key] && typeof value === 'string') {
      updates[key] = value
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  try {
    // Verify photo exists
    const existing = await db.select({ id: photos.id }).from(photos).where(eq(photos.id, photoId)).limit(1)
    if (!existing || existing.length === 0) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
    }

    await db.update(photos).set(updates).where(eq(photos.id, photoId))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating photo metadata:', error)
    return NextResponse.json({ error: 'Failed to update photo' }, { status: 500 })
  }
}

/** PUT /api/admin/photos - reorder approved photos for a watch */
export async function PUT(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!checkAdmin(userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { watchId: string; photoIds: string[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const { watchId, photoIds } = body

  if (!watchId || !Array.isArray(photoIds) || photoIds.length === 0) {
    return NextResponse.json({ error: 'Missing or invalid watchId/photoIds' }, { status: 400 })
  }

  try {
    // Verify all photos exist and belong to the watch
    const existing = await db.select({ id: photos.id }).from(photos).where(and(eq(photos.watchId, watchId), inArray(photos.id, photoIds)))
    if (existing.length !== photoIds.length) {
      return NextResponse.json({ error: 'Not all photos found or do not belong to this watch' }, { status: 400 })
    }

    // Update sortOrder for each photo in the provided order
    for (let i = 0; i < photoIds.length; i++) {
      await db.update(photos).set({ sortOrder: i }).where(eq(photos.id, photoIds[i]))
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error reordering photos:', error)
    return NextResponse.json({ error: 'Failed to reorder photos' }, { status: 500 })
  }
}
