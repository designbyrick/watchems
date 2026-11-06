export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { photos } from '@/lib/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { count } from 'drizzle-orm'
import { checkReadRateLimit } from '@/lib/ratelimit'

/**
 * GET /api/photos/watches
 * Fetch all distinct watches that have at least 1 approved photo
 * Returns watches enriched with metadata, sorted by photo count (descending)
 * Also returns brand aggregations for filter chips and trending brands
 */
export async function GET(req: NextRequest) {
  const { success } = await checkReadRateLimit(req)
  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }
  try {
    // Query for distinct watchIds with approved photos, grouped with count
    const photosByWatch = await db
      .select({
        watchId: photos.watchId,
        photoCount: count(photos.id),
      })
      .from(photos)
      .where(eq(photos.status, 'approved'))
      .groupBy(photos.watchId)

    // Un-slugify a watchId as a display fallback (e.g. "tudor-black-bay-54" → "Tudor Black Bay 54")
    const unslugify = (slug: string): string =>
      slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

    // Fetch representative photo per watch for brand/name metadata
    const watchIds = photosByWatch.map((w) => w.watchId)
    const repPhotos = watchIds.length > 0
      ? await db
          .select({ watchId: photos.watchId, brandName: photos.brandName, modelName: photos.modelName, referenceNumber: photos.referenceNumber })
          .from(photos)
          .where(and(eq(photos.status, 'approved'), inArray(photos.watchId, watchIds)))
          .groupBy(photos.watchId, photos.brandName, photos.modelName, photos.referenceNumber)
          .limit(watchIds.length)
      : []

    const repMap = new Map(repPhotos.map((p) => [p.watchId, p]))

    const enrichedWatches = photosByWatch
      .map((item) => {
        const rep = repMap.get(item.watchId)
        const brand = rep?.brandName ?? null
        const name = rep ? [rep.brandName, rep.modelName].filter(Boolean).join(' ') || unslugify(item.watchId) : unslugify(item.watchId)
        return {
          watchId: item.watchId,
          watchName: name,
          watchBrand: brand,
          watchReference: rep?.referenceNumber ?? null,
          count: item.photoCount,
        }
      })
      .sort((a, b) => b.count - a.count)

    // Aggregate brands with photo counts (for filter chips)
    const brandMap = new Map<string, number>()
    for (const w of enrichedWatches) {
      if (w.watchBrand) {
        brandMap.set(w.watchBrand, (brandMap.get(w.watchBrand) ?? 0) + w.count)
      }
    }
    const brands = Array.from(brandMap.entries())
      .map(([name, photoCount]) => ({ name, photoCount }))
      .sort((a, b) => b.photoCount - a.photoCount)

    // Top 5 brands = trending
    const trending = brands.slice(0, 5).map((b) => b.name)

    // Aggregate visual characteristics for filter chips
    const [dialColors, watchStyles, caseMaterials, strapTypes] = await Promise.all([
      db.select({ value: photos.dialColor, count: count(photos.id) })
        .from(photos).where(eq(photos.status, 'approved'))
        .groupBy(photos.dialColor),
      db.select({ value: photos.watchStyle, count: count(photos.id) })
        .from(photos).where(eq(photos.status, 'approved'))
        .groupBy(photos.watchStyle),
      db.select({ value: photos.caseMaterial, count: count(photos.id) })
        .from(photos).where(eq(photos.status, 'approved'))
        .groupBy(photos.caseMaterial),
      db.select({ value: photos.strapType, count: count(photos.id) })
        .from(photos).where(eq(photos.status, 'approved'))
        .groupBy(photos.strapType),
    ])

    const toChips = (rows: { value: string | null; count: number }[]) =>
      rows
        .filter((r) => r.value)
        .map((r) => ({ name: r.value!, photoCount: r.count }))
        .sort((a, b) => b.photoCount - a.photoCount)

    return NextResponse.json(
      {
        watches: enrichedWatches,
        brands,
        trending,
        dialColors: toChips(dialColors),
        watchStyles: toChips(watchStyles),
        caseMaterials: toChips(caseMaterials),
        strapTypes: toChips(strapTypes),
      },
      // Filter/chip data from approved photos, same for every visitor and fetched on every
      // gallery load: cache it on the Vercel CDN instead of re-aggregating the table each time.
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } }
    )
  } catch (error) {
    console.error('Error fetching watches with photos:', error)
    return NextResponse.json(
      { watches: [], brands: [], trending: [] },
      { status: 500 }
    )
  }
}
