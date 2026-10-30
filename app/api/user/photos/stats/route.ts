import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { photos, photoLikes, collectionItems } from '@/lib/db/schema'
import { eq, and, ne, sql } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

/** GET /api/user/photos/stats — returns like + save counts for all of the current user's photos */
export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  }

  try {
    // Get like counts per photo
    const likeCounts = await db
      .select({
        photoId: photoLikes.photoId,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(photoLikes)
      .innerJoin(photos, eq(photos.id, photoLikes.photoId))
      .where(and(eq(photos.userId, userId), ne(photos.status, 'deleted')))
      .groupBy(photoLikes.photoId)

    // Get save counts per photo (how many users saved it to collections)
    const saveCounts = await db
      .select({
        photoId: collectionItems.photoId,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(collectionItems)
      .innerJoin(photos, eq(photos.id, collectionItems.photoId))
      .where(and(eq(photos.userId, userId), ne(photos.status, 'deleted')))
      .groupBy(collectionItems.photoId)

    const likes: Record<string, number> = {}
    for (const r of likeCounts) likes[r.photoId] = r.count

    const saves: Record<string, number> = {}
    for (const r of saveCounts) saves[r.photoId] = r.count

    return NextResponse.json({ likes, saves })
  } catch (error) {
    console.error('Error fetching photo stats:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
