import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { collectionItems, collections } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

/** GET /api/photos/[id]/saved — returns { savedIn: string[] } (collection IDs containing this photo) */
export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const photoId = params.id
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ savedIn: [] })
  }

  try {
    const rows = await db
      .select({ collectionId: collectionItems.collectionId })
      .from(collectionItems)
      .innerJoin(collections, eq(collections.id, collectionItems.collectionId))
      .where(
        and(
          eq(collectionItems.photoId, photoId),
          eq(collections.userId, userId)
        )
      )

    const savedIn = rows.map((r) => r.collectionId)
    return NextResponse.json({ savedIn })
  } catch (error) {
    console.error('Error fetching saved status:', error)
    return NextResponse.json({ savedIn: [] }, { status: 500 })
  }
}
