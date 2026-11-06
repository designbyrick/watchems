import { MetadataRoute } from 'next'
import { getIsrDb } from '@/lib/db/isr'
import { photos } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { GUIDES } from '@/lib/guides'
import { styles } from '@/lib/styleData'
import { toWatchSlug } from '@/lib/normalizeWatch'
import { isValidSlug } from '@/lib/validation'

// ISR: regenerate at most once an hour
export const revalidate = 3600

// Same thresholds the hub pages use before they render (otherwise they redirect)
const MIN_PHOTOS_BRAND = 3
const MIN_PHOTOS_WATCH = 3 // app/w/[watchId]/page.tsx
const MIN_PHOTOS_STYLE = 5 // app/style/[style]/page.tsx

const base = 'https://watchems.com'

interface Group {
  count: number
  lastModified: Date
}

function bump(map: Map<string, Group>, key: string, date: Date) {
  const g = map.get(key)
  if (!g) map.set(key, { count: 1, lastModified: date })
  else {
    g.count++
    if (date > g.lastModified) g.lastModified = date
  }
}

function latest(dates: Date[]): Date | undefined {
  return dates.length > 0 ? dates.reduce((a, b) => (b > a ? b : a)) : undefined
}

// Uses the ISR client: the default db client fetches with cache: 'no-store',
// which would make this route dynamic.
const getApprovedPhotos = () =>
  getIsrDb(revalidate)
    .select({
      id: photos.id,
      slug: photos.slug,
      watchId: photos.watchId,
      userId: photos.userId,
      brandName: photos.brandName,
      watchStyle: photos.watchStyle,
      sortOrder: photos.sortOrder,
      createdAt: photos.createdAt,
    })
    .from(photos)
    .where(eq(photos.status, 'approved'))
    .orderBy(desc(photos.createdAt))

async function fetchApprovedPhotos() {
  try {
    return await getApprovedPhotos()
  } catch (err) {
    // CI builds (and local dev without Neon) run against a stub DATABASE_URL.
    // Without force-dynamic the sitemap is prerendered at build time, so fall
    // back to the static entries there; the first ISR revalidation fills in the
    // DB pages. In production, rethrow so ISR keeps serving the last good
    // sitemap instead of caching a degraded one.
    if (process.env.NEXT_PHASE === 'phase-production-build' || process.env.NODE_ENV === 'development') {
      console.warn('[sitemap] DB unavailable, emitting static entries only')
      return []
    }
    throw err
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const allPhotos = await fetchApprovedPhotos()

  const brandGroups = new Map<string, Group>()
  const watchGroups = new Map<string, Group>()
  const styleGroups = new Map<string, Group>() // keyed by lower-cased watchStyle
  // Primary photo of each user's carousel for a watch (lowest sortOrder, then earliest createdAt).
  // Secondary photos canonicalise to it (app/photo/[id]/page.tsx), so only primaries go in the sitemap.
  const primaries = new Map<string, (typeof allPhotos)[number]>()

  for (const p of allPhotos) {
    const date = new Date(p.createdAt)
    if (p.brandName) {
      const brandSlug = toWatchSlug(p.brandName)
      if (brandSlug) bump(brandGroups, brandSlug, date)
    }
    if (p.watchId) bump(watchGroups, p.watchId, date)
    if (p.watchStyle) bump(styleGroups, p.watchStyle.toLowerCase(), date)

    const key = `${p.watchId}\u0000${p.userId}`
    const current = primaries.get(key)
    if (
      !current ||
      p.sortOrder < current.sortOrder ||
      (p.sortOrder === current.sortOrder && date < new Date(current.createdAt))
    ) {
      primaries.set(key, p)
    }
  }

  const photoPages: MetadataRoute.Sitemap = Array.from(primaries.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((photo) => ({
      url: `${base}/photo/${photo.slug ?? photo.id}`,
      lastModified: new Date(photo.createdAt),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))

  const brandPages: MetadataRoute.Sitemap = Array.from(brandGroups.entries())
    .filter(([, g]) => g.count >= MIN_PHOTOS_BRAND)
    .map(([slug, g]) => ({
      url: `${base}/brand/${slug}`,
      lastModified: g.lastModified,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))

  const watchPages: MetadataRoute.Sitemap = Array.from(watchGroups.entries())
    .filter(([watchId, g]) => g.count >= MIN_PHOTOS_WATCH && isValidSlug(watchId))
    .map(([watchId, g]) => ({
      url: `${base}/w/${watchId}`,
      lastModified: g.lastModified,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))

  const liveStyles = styles
    .map((s) => ({ style: s, group: styleGroups.get(s.dbValue.toLowerCase()) }))
    .filter((s): s is { style: (typeof styles)[number]; group: Group } =>
      !!s.group && s.group.count >= MIN_PHOTOS_STYLE,
    )
  const stylePages: MetadataRoute.Sitemap = liveStyles.map(({ style, group }) => ({
    url: `${base}/style/${style.slug}`,
    lastModified: group.lastModified,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  const newestPhoto = allPhotos.length > 0 ? new Date(allPhotos[0].createdAt) : undefined

  const staticPages: MetadataRoute.Sitemap = [
    { url: base, lastModified: newestPhoto, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/about`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/terms`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${base}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
  ]

  const hubIndexes: MetadataRoute.Sitemap = [
    {
      url: `${base}/brands`,
      lastModified: latest(brandPages.map((p) => p.lastModified as Date)),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${base}/watches`,
      lastModified: latest(watchPages.map((p) => p.lastModified as Date)),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${base}/styles`,
      lastModified: latest(stylePages.map((p) => p.lastModified as Date)),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ]

  const guidePages: MetadataRoute.Sitemap = [
    { url: `${base}/buying-guides`, changeFrequency: 'monthly', priority: 0.85 },
    ...GUIDES.map((g) => ({
      url: `${base}/buying-guide/${g.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ]

  return [
    ...staticPages,
    ...hubIndexes,
    ...brandPages,
    ...stylePages,
    ...guidePages,
    ...watchPages,
    ...photoPages,
  ]
}
