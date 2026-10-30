import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import crypto from 'crypto'
import { db } from '@/lib/db'
import { wristChecks, photos } from '@/lib/db/schema'
import { eq, and, ne, gte, lte } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

/** GET /api/wrist-checks?month=2026-04 — list entries for a month */
export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  }

  const month = req.nextUrl.searchParams.get('month')
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'month param required (YYYY-MM)' }, { status: 400 })
  }

  const [year, mon] = month.split('-').map(Number)
  const startDate = `${year}-${String(mon).padStart(2, '0')}-01`
  const lastDay = new Date(year, mon, 0).getDate()
  const endDate = `${year}-${String(mon).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  try {
    const rows = await db
      .select({
        id: wristChecks.id,
        photoId: wristChecks.photoId,
        date: wristChecks.date,
        notes: wristChecks.notes,
        watchId: photos.watchId,
        brandName: photos.brandName,
        modelName: photos.modelName,
        thumbnailUrl: photos.thumbnailUrl,
        url: photos.url,
      })
      .from(wristChecks)
      .innerJoin(photos, eq(photos.id, wristChecks.photoId))
      .where(
        and(
          eq(wristChecks.userId, userId),
          ne(photos.status, 'deleted'),
          gte(wristChecks.date, startDate),
          lte(wristChecks.date, endDate)
        )
      )

    return NextResponse.json({ entries: rows })
  } catch (error) {
    console.error('Error fetching wrist checks:', error)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}

/** POST /api/wrist-checks — add a watch to a day */
export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const photoId = typeof body.photoId === 'string' ? body.photoId : ''
    const date = typeof body.date === 'string' ? body.date : ''
    const notes = typeof body.notes === 'string' ? body.notes.trim() : null

    if (!photoId || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'photoId and date (YYYY-MM-DD) required' }, { status: 400 })
    }

    // Verify photo belongs to user
    const photo = await db
      .select({ id: photos.id })
      .from(photos)
      .where(and(eq(photos.id, photoId), eq(photos.userId, userId), ne(photos.status, 'deleted')))
      .limit(1)

    if (photo.length === 0) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
    }

    const id = crypto.randomUUID()
    await db.insert(wristChecks).values({
      id,
      userId,
      photoId,
      date,
      notes,
    })

    return NextResponse.json({ id, photoId, date, notes }, { status: 201 })
  } catch (error) {
    const msg = String(error)
    if (msg.includes('unique') || msg.includes('duplicate')) {
      return NextResponse.json({ error: 'This watch is already logged for this day' }, { status: 409 })
    }
    console.error('Error creating wrist check:', error)
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
  }
}
