import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import crypto from 'crypto'
import { db } from '@/lib/db'
import { collectionItems, collections, photos } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

/** POST /api/collections/[id]/items — add a photo to a collection */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const collectionId = params.id
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  }

  // Verify ownership
  const col = await db
    .select({ id: collections.id })
    .from(collections)
    .where(and(eq(collections.id, collectionId), eq(collections.userId, userId)))
    .limit(1)

  if (col.length === 0) {
    return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
  }

  try {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    const rawPhotoId = (body as { photoId?: unknown } | null)?.photoId
    const photoId = typeof rawPhotoId === 'string' ? rawPhotoId : ''
    if (!photoId) {
      return NextResponse.json({ error: 'photoId is required' }, { status: 400 })
    }

    // Only approved photos can be saved to a board
    const photo = await db
      .select({ id: photos.id })
      .from(photos)
      .where(and(eq(photos.id, photoId), eq(photos.status, 'approved')))
      .limit(1)
    if (photo.length === 0) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
    }

    await db.insert(collectionItems).values({
      id: crypto.randomUUID(),
      collectionId,
      photoId,
      createdAt: new Date(),
    })

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    // Unique constraint violation = already saved
    const msg = String(error)
    if (msg.includes('unique') || msg.includes('duplicate')) {
      return NextResponse.json({ success: true, alreadySaved: true })
    }
    console.error('Error adding to collection:', error)
    return NextResponse.json({ error: 'Failed to add to collection' }, { status: 500 })
  }
}

/** DELETE /api/collections/[id]/items?photoId=xxx — remove a photo from a collection */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const collectionId = params.id
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  }

  // Verify ownership
  const col = await db
    .select({ id: collections.id })
    .from(collections)
    .where(and(eq(collections.id, collectionId), eq(collections.userId, userId)))
    .limit(1)

  if (col.length === 0) {
    return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
  }

  const photoId = req.nextUrl.searchParams.get('photoId')
  if (!photoId) {
    return NextResponse.json({ error: 'photoId query param is required' }, { status: 400 })
  }

  try {
    await db
      .delete(collectionItems)
      .where(
        and(
          eq(collectionItems.collectionId, collectionId),
          eq(collectionItems.photoId, photoId)
        )
      )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing from collection:', error)
    return NextResponse.json({ error: 'Failed to remove from collection' }, { status: 500 })
  }
}
