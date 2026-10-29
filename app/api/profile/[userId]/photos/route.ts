export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import type { ApprovedPhoto } from '@/lib/photos'
import { db } from '@/lib/db'
import { photos } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

/**
 * GET /api/profile/[userId]/photos
 * Fetch all approved photos for a specific user
 */
export async function GET(_req: NextRequest, props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;
  try {
    // Query Postgres for all approved photos by user
    const userPhotos = await db
      .select()
      .from(photos)
      .where(and(eq(photos.userId, params.userId), eq(photos.status, 'approved')))
      .orderBy((p) => p.createdAt)

    // Reverse to get descending order and transform to ApprovedPhoto format
    const result: ApprovedPhoto[] = userPhotos
      .reverse()
      .map((p) => ({
        id: p.id,
        watchId: p.watchId,
        userId: p.userId,
        userName: p.userName,
        url: p.url,
        createdAt: p.createdAt.toISOString(),
        approved: true,
      }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching user photos:', error)
    // Return empty array on error
    return NextResponse.json([])
  }
}
