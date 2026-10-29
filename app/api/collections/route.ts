import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import crypto from 'crypto'
import { db } from '@/lib/db'
import { collections, collectionItems, photos } from '@/lib/db/schema'
import { eq, and, sql, desc } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

/** GET /api/collections — list current user's collections with cover image + item count */
export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Sign in to view collections' }, { status: 401 })
  }

  try {
    const rows = await db
      .select({
        id: collections.id,
        name: collections.name,
        createdAt: collections.createdAt,
        // Count joined photos, not items, so deleted/unapproved photos aren't counted
        itemCount: sql<number>`cast(count(${photos.id}) as int)`,
        coverUrl: sql<string | null>`max(coalesce(${photos.thumbnailUrl}, ${photos.url}))`,
      })
      .from(collections)
      .leftJoin(collectionItems, eq(collectionItems.collectionId, collections.id))
      .leftJoin(photos, and(eq(photos.id, collectionItems.photoId), eq(photos.status, 'approved')))
      .where(eq(collections.userId, userId))
      .groupBy(collections.id)
      .orderBy(desc(collections.createdAt))

    return NextResponse.json({ collections: rows })
  } catch (error) {
    console.error('Error fetching collections:', error)
    return NextResponse.json({ error: 'Failed to fetch collections' }, { status: 500 })
  }
}

/** POST /api/collections — create a new collection */
export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Sign in to create collections' }, { status: 401 })
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
      return NextResponse.json({ error: 'Collection name is required (max 100 chars)' }, { status: 400 })
    }

    const id = crypto.randomUUID()
    await db.insert(collections).values({
      id,
      userId,
      name,
      createdAt: new Date(),
    })

    return NextResponse.json({ id, name }, { status: 201 })
  } catch (error) {
    console.error('Error creating collection:', error)
    return NextResponse.json({ error: 'Failed to create collection' }, { status: 500 })
  }
}
