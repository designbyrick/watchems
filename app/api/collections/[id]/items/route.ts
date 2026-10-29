import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import crypto from 'crypto'
import { db } from '@/lib/db'
import { collectionItems, collections } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

/** POST /api/collections/[id]/items — add a photo to a collection */
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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
    const body = await req.json()
    const photoId = typeof body.photoId === 'string' ? body.photoId : ''
    if (!photoId) {
      return NextResponse.json({ error: 'photoId is required' }, { status: 400 })
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
export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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
