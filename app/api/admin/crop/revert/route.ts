import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { checkAdmin } from '@/lib/admin'
import { db } from '@/lib/db'
import { photos } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { revalidateCatalog } from '@/lib/revalidateCatalog'
import sharp from 'sharp'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/crop/revert — restore original pre-crop image.
 * Fetches the original from R2 (stored at originalUrl), re-processes
 * it with sharp to regenerate full-size + thumbnail, and updates the DB.
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!checkAdmin(userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { photoId } = (await req.json()) as { photoId: string }
  if (!photoId) return NextResponse.json({ error: 'Missing photoId' }, { status: 400 })

  try {
    const [photo] = await db.select().from(photos).where(eq(photos.id, photoId)).limit(1)
    if (!photo) return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
    if (!photo.originalUrl) return NextResponse.json({ error: 'No original to revert to' }, { status: 400 })

    // Fetch the original image
    const res = await fetch(photo.originalUrl)
    if (!res.ok) return NextResponse.json({ error: 'Failed to fetch original image' }, { status: 502 })
    const rawBuffer = Buffer.from(await res.arrayBuffer())

    // Re-process with sharp (same pipeline as upload)
    const rotated = sharp(rawBuffer).rotate()
    const [cleanBuffer, thumbBuffer] = await Promise.all([
      rotated.clone()
        .resize(2400, 2400, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer(),
      rotated.clone()
        .resize(600, 600, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 75 })
        .toBuffer(),
    ])

    // Re-upload to R2 under a versioned key to bust CDN caches
    const { uploadCroppedPhotoToR2, isR2Configured } = await import('@/lib/r2')
    if (!isR2Configured) return NextResponse.json({ error: 'R2 not configured' }, { status: 500 })

    const version = Date.now()
    const [newUrl, newThumbUrl] = await Promise.all([
      uploadCroppedPhotoToR2(photo.watchId, photo.id, version, cleanBuffer, false),
      uploadCroppedPhotoToR2(photo.watchId, photo.id, version, thumbBuffer, true),
    ])

    // Update DB: restore URLs, clear originalUrl
    await db.update(photos).set({
      url: newUrl,
      thumbnailUrl: newThumbUrl,
      originalUrl: null,
    }).where(eq(photos.id, photoId))

    revalidateCatalog()
    return NextResponse.json({ success: true, url: newUrl, thumbnailUrl: newThumbUrl })
  } catch (error) {
    console.error('[Admin crop/revert] Error:', error)
    return NextResponse.json({ error: 'Revert failed' }, { status: 500 })
  }
}
