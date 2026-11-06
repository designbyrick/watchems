import { NextResponse } from 'next/server'
import { getIsrDb } from '@/lib/db/isr'
import { photos } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { desc } from 'drizzle-orm'

export const revalidate = 86400 // ISR: regenerate at most once a day; writes purge it early via lib/revalidatePublic

/**
 * Escape XML special characters for safe inclusion in XML text content.
 */
function escapeXml(str: string | null | undefined): string {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// Uses the ISR client: the default db client fetches with cache: 'no-store',
// which would make this route dynamic.
const getApprovedPhotos = () =>
  getIsrDb(revalidate)
    .select({
      id: photos.id,
      slug: photos.slug,
      url: photos.url,
      watchId: photos.watchId,
      userId: photos.userId,
      sortOrder: photos.sortOrder,
      createdAt: photos.createdAt
    })
    .from(photos)
    .where(eq(photos.status, 'approved'))
    .orderBy(desc(photos.createdAt))
    .limit(50000)

async function fetchApprovedPhotos() {
  try {
    return await getApprovedPhotos()
  } catch (err) {
    // CI builds (and local dev without Neon) use a stub DATABASE_URL and this
    // route is prerendered at build time (ISR). Emit an empty sitemap there; in
    // production rethrow so ISR keeps serving the last good version.
    if (process.env.NEXT_PHASE === 'phase-production-build' || process.env.NODE_ENV === 'development') {
      console.warn('[image-sitemap] DB unavailable, emitting empty sitemap')
      return []
    }
    throw err
  }
}

export async function GET() {
  // Query approved photos, ordered by createdAt DESC, limited to 50,000
  const allPhotos = await fetchApprovedPhotos()

  const baseUrl = 'https://watchems.com'

  // One <url> per canonical photo page. Secondary carousel photos canonicalize
  // to the primary one (lowest sortOrder, then earliest createdAt — same rule as
  // app/sitemap.ts), so their images are listed under the primary's <loc>.
  type Row = (typeof allPhotos)[number]
  const carousels = new Map<string, Row[]>()
  for (const photo of allPhotos) {
    if (!photo.url) continue // Skip photos with null/empty URL
    const key = `${photo.watchId}\u0000${photo.userId}`
    const group = carousels.get(key)
    if (group) group.push(photo)
    else carousels.set(key, [photo])
  }

  const entries = Array.from(carousels.values())
    .map((group) => {
      group.sort(
        (a, b) => a.sortOrder - b.sortOrder || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
      const primary = group[0]
      // Full-size image (thumbnails are a poor candidate for Google Images);
      // image:title/caption are omitted — Google no longer reads them.
      const images = group
        .map((photo) => `
    <image:image>
      <image:loc>${escapeXml(photo.url)}</image:loc>
    </image:image>`)
        .join('')

      return `
  <url>
    <loc>${escapeXml(`${baseUrl}/photo/${primary.slug ?? primary.id}`)}</loc>${images}
  </url>`
    })
    .join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${entries}
</urlset>`

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600'
    }
  })
}
