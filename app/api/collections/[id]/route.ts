import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { collections, collectionItems, photos } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

/** GET /api/collections/[id] — get collection details + all photos */
export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const collectionId = params.id
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  }

  try {
    const col = await db
      .select()
      .from(collections)
      .where(and(eq(collections.id, collectionId), eq(collections.userId, userId)))
      .limit(1)

    if (col.length === 0) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 })
    }

    const items = await db
      .select({
        id: photos.id,
        slug: photos.slug,
        url: photos.url,
        thumbnailUrl: photos.thumbnailUrl,
        brandName: photos.brandName,
        modelName: photos.modelName,
        referenceNumber: photos.referenceNumber,
        userName: photos.userName,
        watchId: photos.watchId,
        savedAt: collectionItems.createdAt,
      })
      .from(collectionItems)
      .innerJoin(photos, eq(photos.id, collectionItems.photoId))
      .where(and(eq(collectionItems.collectionId, collectionId), eq(photos.status, 'approved')))
      .orderBy(desc(collectionItems.createdAt))

    return NextResponse.json({
      id: col[0].id,
      name: col[0].name,
      createdAt: col[0].createdAt,
      photos: items,
    })
  } catch (error) {
    console.error('Error fetching collection:', error)
    return NextResponse.json({ error: 'Failed to fetch collection' }, { status: 500 })
  }
}

/** PATCH /api/collections/[id] — rename a collection */
export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const collectionId = params.id
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  }

  const col = await db
    .select({ id: collections.id })
    .from(collections)
    .where(and(eq(collections.id, collectionId), eq(collections.userId, userId)))
    .limit(1)

  if (col.length === 0) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 })
  }

  try {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    const rawName = (body as { name?: unknown } | null)?.name
    const name = typeof rawName === 'string' ? rawName.trim() : ''
    if (!name || name.length > 100) {
      return NextResponse.json({ error: 'Name is required (max 100 chars)' }, { status: 400 })
    }

    await db.update(collections).set({ name }).where(eq(collections.id, collectionId))
    return NextResponse.json({ success: true, name })
  } catch (error) {
    console.error('Error renaming collection:', error)
    return NextResponse.json({ error: 'Failed to rename' }, { status: 500 })
  }
}

/** DELETE /api/collections/[id] — delete a collection and all its items */
export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const collectionId = params.id
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  }

  const col = await db
    .select({ id: collections.id })
    .from(collections)
    .where(and(eq(collections.id, collectionId), eq(collections.userId, userId)))
    .limit(1)

  if (col.length === 0) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 })
  }

  try {
    await db.delete(collectionItems).where(eq(collectionItems.collectionId, collectionId))
    await db.delete(collections).where(eq(collections.id, collectionId))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting collection:', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
