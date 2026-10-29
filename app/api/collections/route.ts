import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import crypto from 'crypto'
import { db } from '@/lib/db'
import { collections, collectionItems, photos } from '@/lib/db/schema'
import { eq, sql, desc } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

/** GET /api/collections — list current user's collections with cover images + item count */
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
        itemCount: sql<number>`cast(count(${collectionItems.id}) as int)`,
        coverUrl: sql<string | null>`max(coalesce(${photos.thumbnailUrl}, ${photos.url}))`,
        // Up to 3 most recently saved images, for the board mosaic
        coverUrls: sql<string[]>`coalesce((array_remove(array_agg(coalesce(${photos.thumbnailUrl}, ${photos.url}) order by ${collectionItems.createdAt} desc), null))[1:3], '{}')`,
      })
      .from(collections)
      .leftJoin(collectionItems, eq(collectionItems.collectionId, collections.id))
      .leftJoin(photos, eq(photos.id, collectionItems.photoId))
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
    const body = await req.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''
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
