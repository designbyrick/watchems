export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { photos } from '@/lib/db/schema'
import { eq, or } from 'drizzle-orm'
import { isValidSlug } from '@/lib/validation'
import type { ApprovedPhoto } from '@/lib/photos'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** GET /api/photo/[id] — fetch single approved photo by slug or UUID */
export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const param = params.id
  const isUUID = UUID_REGEX.test(param)

  if (!isUUID && !isValidSlug(param)) {
    return NextResponse.json({ error: 'Invalid photo ID' }, { status: 400 })
  }

  try {
    const photoRecord = await db
      .select()
      .from(photos)
      .where(isUUID ? eq(photos.id, param) : or(eq(photos.slug, param), eq(photos.id, param))!)
      .limit(1)

    if (photoRecord.length === 0 || photoRecord[0].status !== 'approved') {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
    }

    const p = photoRecord[0]
    const approved: ApprovedPhoto = {
      id: p.id,
      slug: p.slug,
      watchId: p.watchId,
      userId: p.userId,
      userName: p.userName,
      url: p.url,
      brandName: p.brandName ?? undefined,
      modelName: p.modelName ?? undefined,
      referenceNumber: p.referenceNumber ?? undefined,
      movement: p.movement ?? undefined,
      caseSize: p.caseSize ?? undefined,
      wristSize: p.wristSize ?? undefined,
      estimatedPrice: p.estimatedPrice ?? undefined,
      lugToLug: p.lugToLug ?? undefined,
      betweenLugs: p.betweenLugs ?? undefined,
      thickness: p.thickness ?? undefined,
      waterResistance: p.waterResistance ?? undefined,
      approved: true,
      createdAt: p.createdAt.toISOString(),
    }

    return NextResponse.json(approved)
  } catch (error) {
    console.error('Error fetching photo:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
