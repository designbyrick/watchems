export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { photos } from '@/lib/db/schema'
import { eq, lt, and, desc, or, ilike, sql as drizzleSql } from 'drizzle-orm'
import { checkAdmin } from '@/lib/admin'
import { checkReadRateLimit } from '@/lib/ratelimit'
import { escapeLike, parseIntParam } from '@/lib/validation'

/**
 * GET /api/photos/all?limit=50&cursor=<timestamp>&brand=rolex&movement=automatic&priceMin=500&priceMax=2000&caseSizeMin=38&caseSizeMax=42
 * Fetch ALL approved photos across ALL watches from Postgres
 * Supports cursor-based pagination, text search, and filter chips
 */
export async function GET(req: NextRequest) {
  const { success } = await checkReadRateLimit(req)
  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }
  const searchParams = req.nextUrl.searchParams
  const limit = Math.min(Math.max(parseIntParam(searchParams.get('limit')) ?? 50, 1), 100)
  const cursor = searchParams.get('cursor')
  const cursorTime = cursor ? new Date(cursor) : null
  if (cursorTime && Number.isNaN(cursorTime.getTime())) {
    return NextResponse.json({ error: 'Invalid cursor' }, { status: 400 })
  }
  const brand = searchParams.get('brand')?.toLowerCase() ?? ''
  const watchId = searchParams.get('watchId') ?? ''
  const userId = searchParams.get('userId') ?? ''
  const q = searchParams.get('q')?.toLowerCase() ?? ''

  // New filter params
  const filterMovement = searchParams.get('movement')?.toLowerCase() ?? ''
  const priceMin = parseIntParam(searchParams.get('priceMin'))
  const priceMax = parseIntParam(searchParams.get('priceMax'))
  const caseSizeMin = parseIntParam(searchParams.get('caseSizeMin'))
  const caseSizeMax = parseIntParam(searchParams.get('caseSizeMax'))
  // Visual characteristic filters
  const filterDialColor = searchParams.get('dialColor')?.toLowerCase() ?? ''
  const filterWatchStyle = searchParams.get('watchStyle')?.toLowerCase() ?? ''
  const filterCaseMaterial = searchParams.get('caseMaterial')?.toLowerCase() ?? ''
  const filterStrapType = searchParams.get('strapType')?.toLowerCase() ?? ''

  try {
    // Build where condition
    const conditions = [eq(photos.status, 'approved')]
    if (cursorTime) {
      conditions.push(lt(photos.createdAt, cursorTime))
    }
    if (watchId) {
      conditions.push(eq(photos.watchId, watchId))
    }
    if (userId) {
      conditions.push(eq(photos.userId, userId))
    }

    // Visual characteristic filters (direct DB column match)
    if (filterDialColor) conditions.push(eq(photos.dialColor, filterDialColor))
    if (filterWatchStyle) conditions.push(eq(photos.watchStyle, filterWatchStyle))
    if (filterCaseMaterial) conditions.push(eq(photos.caseMaterial, filterCaseMaterial))
    if (filterStrapType) conditions.push(eq(photos.strapType, filterStrapType))

    // Movement filter: match against DB movement field
    if (filterMovement && !watchId) {
      conditions.push(ilike(photos.movement, `%${escapeLike(filterMovement)}%`))
    }

    // Brand filter: match against DB brandName field
    if (brand && !watchId) {
      conditions.push(ilike(photos.brandName, `%${escapeLike(brand)}%`))
    }

    // Push search query to DB level (fixes pagination + filter mismatch)
    if (q && !watchId) {
      // Split into tokens so "rolex sub 41" matches all three fields independently
      const tokens = q.split(/\s+/).filter(Boolean)

      // Similarity threshold for typo tolerance
      const SIMILARITY_THRESHOLD = 0.25

      // Each token must match at least one column (AND across tokens, OR across columns)
      // For tokens >= 4 chars, also try trigram similarity for typo tolerance
      for (const token of tokens) {
        const likeToken = `%${escapeLike(token)}%`
        const tokenConditions: ReturnType<typeof ilike>[] = [
          ilike(photos.brandName, likeToken),
          ilike(photos.modelName, likeToken),
          ilike(photos.referenceNumber, likeToken),
          ilike(photos.watchId, likeToken),
          ilike(photos.movement, likeToken),
          ilike(photos.waterResistance, likeToken),
          ilike(photos.estimatedPrice, likeToken),
          ilike(photos.caseSize, likeToken),
        ]

        if (token.length >= 4) {
          tokenConditions.push(
            drizzleSql`similarity(${photos.brandName}, ${token}) > ${SIMILARITY_THRESHOLD}` as ReturnType<typeof ilike>
          )
          tokenConditions.push(
            drizzleSql`similarity(${photos.modelName}, ${token}) > ${SIMILARITY_THRESHOLD}` as ReturnType<typeof ilike>
          )
        }

        conditions.push(or(...tokenConditions)!)
      }
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0]

    const hasActiveFilter = !!(q || brand || filterMovement || priceMin !== null || priceMax !== null || caseSizeMin !== null || caseSizeMax !== null || filterDialColor || filterWatchStyle || filterCaseMaterial || filterStrapType)

    // Run count query in parallel with the data query
    const [photoRecords, countResult] = await Promise.all([
      db
        .select({
          id: photos.id,
          watchId: photos.watchId,
          userId: photos.userId,
          userName: photos.userName,
          url: photos.url,
          thumbnailUrl: photos.thumbnailUrl,
          status: photos.status,
          createdAt: photos.createdAt,
          brandName: photos.brandName,
          modelName: photos.modelName,
          referenceNumber: photos.referenceNumber,
          movement: photos.movement,
          caseSize: photos.caseSize,
          wristSize: photos.wristSize,
          estimatedPrice: photos.estimatedPrice,
          lugToLug: photos.lugToLug,
          betweenLugs: photos.betweenLugs,
          thickness: photos.thickness,
          waterResistance: photos.waterResistance,
          dialColor: photos.dialColor,
          bezelColor: photos.bezelColor,
          caseMaterial: photos.caseMaterial,
          strapType: photos.strapType,
          watchStyle: photos.watchStyle,
          sortOrder: photos.sortOrder,
          slug: photos.slug,
        })
        .from(photos)
        .where(whereClause)
        .orderBy(desc(photos.createdAt))
        .limit(limit + 1),
      hasActiveFilter
        ? db
            .select({ count: drizzleSql<number>`count(*)::int` })
            .from(photos)
            .where(whereClause)
            .then((r) => r[0]?.count ?? 0)
        : Promise.resolve(null),
    ])

    // Un-slugify a watchId as a display fallback (e.g. "tudor-black-bay-54" → "Tudor Black Bay 54")
    const unslugify = (slug: string): string =>
      slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

    // Enrich photos with display fields
    const enriched = photoRecords.map((p) => {
      return {
        id: p.id,
        watchId: p.watchId,
        userId: p.userId,
        userName: p.userName,
        isOfficial: p.userId ? checkAdmin(p.userId) : false,
        url: p.url,
        thumbnailUrl: p.thumbnailUrl ?? null,
        createdAt: p.createdAt.toISOString(),
        approved: true,
        watchSlug: p.watchId,
        watchName: [p.brandName, p.modelName].filter(Boolean).join(' ') || unslugify(p.watchId),
        watchBrand: p.brandName ?? null,
        watchReference: p.referenceNumber ?? null,
        brandName: p.brandName ?? null,
        modelName: p.modelName ?? null,
        referenceNumber: p.referenceNumber ?? null,
        movement: p.movement ?? null,
        caseSize: p.caseSize ?? null,
        wristSize: p.wristSize ?? null,
        estimatedPrice: p.estimatedPrice ?? null,
        lugToLug: p.lugToLug ?? null,
        betweenLugs: p.betweenLugs ?? null,
        thickness: p.thickness ?? null,
        waterResistance: p.waterResistance ?? null,
        dialColor: p.dialColor ?? null,
        bezelColor: p.bezelColor ?? null,
        caseMaterial: p.caseMaterial ?? null,
        strapType: p.strapType ?? null,
        watchStyle: p.watchStyle ?? null,
        sortOrder: p.sortOrder,
        slug: p.slug ?? null,
      }
    })

    // Take limit and compute next cursor
    const result = enriched.slice(0, limit)
    const nextCursor = enriched.length > limit ? result[result.length - 1]?.createdAt ?? null : null

    // When a text search returns zero results, suggest the closest matches
    let suggestions: string[] | undefined
    if (q && result.length === 0) {
      const suggestionRows = await db
        .select({
          brandName: photos.brandName,
          modelName: photos.modelName,
          sim: drizzleSql<number>`GREATEST(
            similarity(${photos.brandName}, ${q}),
            similarity(${photos.modelName}, ${q})
          )`,
        })
        .from(photos)
        .where(eq(photos.status, 'approved'))
        .orderBy(drizzleSql`GREATEST(similarity(${photos.brandName}, ${q}), similarity(${photos.modelName}, ${q})) DESC`)
        .limit(10)

      const uniqueSuggestions = Array.from(new Set(
        suggestionRows
          .filter((r) => r.sim > 0.1)
          .map((r) => [r.brandName, r.modelName].filter(Boolean).join(' '))
      ))
      suggestions = uniqueSuggestions.slice(0, 5)
    }

    return NextResponse.json(
      { photos: result, nextCursor, totalCount: countResult, suggestions },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    console.error('[/api/photos/all] Query failed:', error)
    return NextResponse.json(
      { error: 'Failed to fetch photos', photos: [], nextCursor: null, totalCount: 0 },
      { status: 500 }
    )
  }
}
