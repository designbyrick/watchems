import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import crypto from 'crypto'
import { db } from '@/lib/db'
import { photoLikes } from '@/lib/db/schema'
import { eq, and, sql } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

/** GET /api/photos/[id]/like — returns { liked: boolean, count: number } */
export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const photoId = params.id
  try {
    const { userId } = await auth()

    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(photoLikes)
      .where(eq(photoLikes.photoId, photoId))

    const count = countResult[0]?.count ?? 0

    let liked = false
    if (userId) {
      const existing = await db
        .select({ id: photoLikes.id })
        .from(photoLikes)
        .where(and(eq(photoLikes.photoId, photoId), eq(photoLikes.userId, userId)))
        .limit(1)
      liked = existing.length > 0
    }

    return NextResponse.json({ liked, count })
  } catch (error) {
    console.error('Error fetching like status:', error)
    return NextResponse.json({ liked: false, count: 0 }, { status: 500 })
  }
}

/** POST /api/photos/[id]/like — toggle like (requires auth) */
export async function POST(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const photoId = params.id
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Sign in to like photos' }, { status: 401 })
  }

  try {
    const existing = await db
      .select({ id: photoLikes.id })
      .from(photoLikes)
      .where(and(eq(photoLikes.photoId, photoId), eq(photoLikes.userId, userId)))
      .limit(1)

    if (existing.length > 0) {
      // Unlike
      await db.delete(photoLikes).where(eq(photoLikes.id, existing[0].id))
    } else {
      // Like
      await db.insert(photoLikes).values({
        id: crypto.randomUUID(),
        photoId,
        userId,
        createdAt: new Date(),
      })
    }

    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(photoLikes)
      .where(eq(photoLikes.photoId, photoId))

    const count = countResult[0]?.count ?? 0
    const liked = existing.length === 0 // toggled: was not liked, now liked

    return NextResponse.json({ liked, count })
  } catch (error) {
    console.error('Error toggling like:', error)
    return NextResponse.json({ error: 'Failed to update like' }, { status: 500 })
  }
}
