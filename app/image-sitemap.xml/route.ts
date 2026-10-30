import { NextResponse } from 'next/server'
import { getIsrDb } from '@/lib/db/isr'
import { photos } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { desc } from 'drizzle-orm'
import { buildPhotoAltText } from '@/lib/photoAlt'

export const revalidate = 3600 // ISR: regenerate at most once an hour

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
      thumbnailUrl: photos.thumbnailUrl,
      brandName: photos.brandName,
      modelName: photos.modelName,
      referenceNumber: photos.referenceNumber,
      userName: photos.userName,
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

  // Build XML entries
  const entries = allPhotos
    .filter(photo => photo.url) // Skip photos with null/empty URL
    .map(photo => {
      // Use buildPhotoAltText for the title
      const altText = buildPhotoAltText({
        brandName: photo.brandName,
        modelName: photo.modelName,
        referenceNumber: photo.referenceNumber,
        userName: photo.userName,
      })

      // Build caption with reference number if available
      const caption = `On-wrist photo of ${photo.brandName || 'watch'} ${photo.modelName || ''}${
        photo.referenceNumber ? ` ref. ${photo.referenceNumber}` : ''
      } submitted by ${photo.userName}`.trim()

      // Use thumbnailUrl if available (faster for Google crawling), fallback to url
      const imageUrl = photo.thumbnailUrl || photo.url

      return `
  <url>
    <loc>${escapeXml(`${baseUrl}/photo/${photo.slug ?? photo.id}`)}</loc>
    <image:image>
      <image:loc>${escapeXml(imageUrl)}</image:loc>
      <image:title>${escapeXml(altText)}</image:title>
      <image:caption>${escapeXml(caption)}</image:caption>
    </image:image>
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
