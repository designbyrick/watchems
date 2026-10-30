import { db } from '@/lib/db'
import { photos } from '@/lib/db/schema'
import { eq, desc, sql } from 'drizzle-orm'
import { checkAdmin } from '@/lib/admin'

/**
 * Photos per crawlable gallery page (`/` and `/page/[n]`).
 * Larger than the client's infinite-scroll batch so the server-rendered page
 * still shows a full grid after photos are grouped by watch + uploader.
 */
export const GALLERY_PAGE_SIZE = 48

export interface InitialPhoto {
  id: string
  slug: string | undefined
  watchId: string
  userId: string
  url: string
  thumbnailUrl: string | undefined
  userName: string
  isOfficial: boolean
  createdAt: string
  watchSlug: string
  watchName: string
  watchBrand: string | undefined
  watchReference: string | undefined
  brandName: string | undefined
  modelName: string | undefined
  referenceNumber: string | undefined
  movement: string | undefined
  caseSize: string | undefined
  wristSize: string | undefined
  estimatedPrice: string | undefined
  lugToLug: string | undefined
  betweenLugs: string | undefined
  thickness: string | undefined
  waterResistance: string | undefined
  sortOrder: number
}

export interface InitialPhotosData {
  photos: InitialPhoto[]
  /** createdAt of the last photo — the client's infinite scroll continues from here */
  nextCursor: string | null
  totalCount: number | null
  page: number
  totalPages: number
}

const unslugify = (slug: string): string =>
  slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

/**
 * Fetch one page of the unfiltered home gallery (newest first) on the server.
 * `page` is 1-based and offset-paginated so every page has a stable, crawlable URL.
 */
export async function getInitialPhotos(page = 1): Promise<InitialPhotosData> {
  const safePage = Math.max(1, Math.floor(page))
  try {
    const where = eq(photos.status, 'approved')
    const [photoRecords, totalCount] = await Promise.all([
      db
        .select({
          id: photos.id,
          watchId: photos.watchId,
          userId: photos.userId,
          userName: photos.userName,
          url: photos.url,
          thumbnailUrl: photos.thumbnailUrl,
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
          sortOrder: photos.sortOrder,
          slug: photos.slug,
        })
        .from(photos)
        .where(where)
        .orderBy(desc(photos.createdAt))
        .limit(GALLERY_PAGE_SIZE + 1)
        .offset((safePage - 1) * GALLERY_PAGE_SIZE),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(photos)
        .where(where)
        .then((r) => r[0]?.count ?? 0),
    ])

    const enriched: InitialPhoto[] = photoRecords.map((p) => {
      return {
        id: p.id,
        slug: p.slug ?? undefined,
        watchId: p.watchId,
        userId: p.userId,
        userName: p.userName,
        isOfficial: p.userId ? checkAdmin(p.userId) : false,
        url: p.url,
        thumbnailUrl: p.thumbnailUrl ?? undefined,
        createdAt: p.createdAt.toISOString(),
        watchSlug: p.watchId,
        watchName: [p.brandName, p.modelName].filter(Boolean).join(' ') || unslugify(p.watchId),
        watchBrand: p.brandName ?? undefined,
        watchReference: p.referenceNumber ?? undefined,
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
        sortOrder: p.sortOrder,
      }
    })

    const result = enriched.slice(0, GALLERY_PAGE_SIZE)
    const nextCursor = enriched.length > GALLERY_PAGE_SIZE ? result[result.length - 1]?.createdAt ?? null : null

    return {
      photos: result,
      nextCursor,
      totalCount,
      page: safePage,
      totalPages: Math.max(1, Math.ceil(totalCount / GALLERY_PAGE_SIZE)),
    }
  } catch (error) {
    // Fall back to empty — the client fetches on mount
    console.error('[getInitialPhotos] Query failed:', error)
    return { photos: [], nextCursor: null, totalCount: null, page: safePage, totalPages: 1 }
  }
}
