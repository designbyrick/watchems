export const dynamic = 'force-dynamic'
export const revalidate = 0

import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { db } from '@/lib/db'
import { photos } from '@/lib/db/schema'
import { eq, and, desc, sql, isNotNull, ilike } from 'drizzle-orm'
import { buildPhotoAltText } from '@/lib/photoAlt'
import { getStyleBySlug } from '@/lib/styleData'

const MIN_PHOTOS_FOR_HUB = 5

interface StylePageProps {
  params: Promise<{ style: string }>
}

export async function generateMetadata(props: StylePageProps): Promise<Metadata> {
  const params = await props.params;
  const styleEntry = getStyleBySlug(params.style)
  if (!styleEntry) return { title: 'Style Not Found | Watchems' }

  const stats = await db
    .select({ photoCount: sql<number>`count(*)::int` })
    .from(photos)
    .where(and(eq(photos.status, 'approved'), ilike(photos.watchStyle, styleEntry.dbValue)))
    .then((r) => r[0])

  const repPhoto = await db
    .select({ thumbnailUrl: photos.thumbnailUrl, url: photos.url })
    .from(photos)
    .where(and(eq(photos.status, 'approved'), ilike(photos.watchStyle, styleEntry.dbValue)))
    .orderBy(desc(photos.createdAt))
    .limit(1)
    .then((r) => r[0])

  const photoCount = stats?.photoCount ?? 0
  const imageUrl = repPhoto?.thumbnailUrl ?? repPhoto?.url ?? ''

  const title = `${styleEntry.name} on the Wrist — Real Owner Photos | Watchems`
  const description = `Browse ${photoCount} real owner photos of ${styleEntry.name.toLowerCase()} worn on the wrist. Community-submitted wrist shots — no affiliate links, just real watches on real wrists.`

  return {
    title,
    description,
    robots: { index: false, follow: false },
    alternates: {
      canonical: `https://watchems.com/style/${styleEntry.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `https://watchems.com/style/${styleEntry.slug}`,
      type: 'website',
      siteName: 'Watchems',
      images: imageUrl ? [{ url: imageUrl, width: 1200, height: 630, alt: `${styleEntry.name} wrist photos` }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: imageUrl ? [imageUrl] : [],
    },
  }
}

export default async function StylePage(props: StylePageProps) {
  const params = await props.params;
  const styleEntry = getStyleBySlug(params.style)
  if (!styleEntry) notFound()

  // Stats + threshold guard
  const stats = await db
    .select({ photoCount: sql<number>`count(*)::int` })
    .from(photos)
    .where(and(eq(photos.status, 'approved'), ilike(photos.watchStyle, styleEntry.dbValue)))
    .then((r) => r[0])

  if (!stats || stats.photoCount < MIN_PHOTOS_FOR_HUB) {
    redirect(`/?watchStyle=${encodeURIComponent(styleEntry.dbValue)}`)
  }

  // Representative photo for structured data
  const repPhoto = await db
    .select({ thumbnailUrl: photos.thumbnailUrl, url: photos.url })
    .from(photos)
    .where(and(eq(photos.status, 'approved'), ilike(photos.watchStyle, styleEntry.dbValue)))
    .orderBy(desc(photos.createdAt))
    .limit(1)
    .then((r) => r[0])

  const imageUrl = repPhoto?.thumbnailUrl ?? repPhoto?.url ?? ''

  // Watch model sub-grid: watchId groups with 3+ photos in this style
  const watchGroups = await db
    .select({
      watchId: photos.watchId,
      brandName: photos.brandName,
      modelName: photos.modelName,
      photoCount: sql<number>`count(*)::int`,
      thumbnailUrl: sql<string | null>`min(${photos.thumbnailUrl})`,
      url: sql<string>`min(${photos.url})`,
    })
    .from(photos)
    .where(
      and(
        eq(photos.status, 'approved'),
        ilike(photos.watchStyle, styleEntry.dbValue),
        isNotNull(photos.watchId),
      ),
    )
    .groupBy(photos.watchId, photos.brandName, photos.modelName)
    .having(sql`count(*) >= 3`)
    .orderBy(sql`count(*) DESC`)
    .limit(12)

  // Recent photos
  const recentPhotos = await db
    .select({
      id: photos.id,
      slug: photos.slug,
      url: photos.url,
      thumbnailUrl: photos.thumbnailUrl,
      brandName: photos.brandName,
      modelName: photos.modelName,
      referenceNumber: photos.referenceNumber,
      userName: photos.userName,
      caseSize: photos.caseSize,
    })
    .from(photos)
    .where(and(eq(photos.status, 'approved'), ilike(photos.watchStyle, styleEntry.dbValue)))
    .orderBy(desc(photos.createdAt))
    .limit(12)

  // Structured data
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://watchems.com' },
      { '@type': 'ListItem', position: 2, name: 'Watch Styles', item: 'https://watchems.com/styles' },
      { '@type': 'ListItem', position: 3, name: styleEntry.name, item: `https://watchems.com/style/${styleEntry.slug}` },
    ],
  }

  const collectionPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${styleEntry.name} Wrist Photos`,
    description: `Real owner wrist photos of ${styleEntry.name.toLowerCase()} worn on the wrist, submitted by the Watchems community.`,
    url: `https://watchems.com/style/${styleEntry.slug}`,
    numberOfItems: stats.photoCount,
    image: imageUrl || undefined,
  }

  const faqJsonLd = styleEntry.faq.length > 0
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: styleEntry.faq.map(({ question, answer }) => ({
          '@type': 'Question',
          name: question,
          acceptedAnswer: { '@type': 'Answer', text: answer },
        })),
      }
    : null

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPageJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* Breadcrumb */}
        <nav className="text-xs text-gray-400 mb-6 flex items-center gap-1.5">
          <Link href="/" className="hover:text-gray-600 transition-colors">Home</Link>
          <span>/</span>
          <Link href="/styles" className="hover:text-gray-600 transition-colors">Styles</Link>
          <span>/</span>
          <span className="text-gray-600">{styleEntry.name}</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">
            {styleEntry.name} Wrist Photos
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            {stats.photoCount} real owner photo{stats.photoCount !== 1 ? 's' : ''} on the wrist
          </p>
        </div>

        {/* Editorial overview */}
        <div className="bg-gray-50 rounded-xl border border-gray-100 p-5 mb-8">
          <p className="text-sm font-medium text-gray-700 mb-3 italic">
            &ldquo;{styleEntry.heroFact}&rdquo;
          </p>
          <p className="text-sm text-gray-600 leading-relaxed">{styleEntry.overview}</p>
        </div>

        {/* Notable watch models */}
        {watchGroups.length > 0 && (
          <div className="mb-10">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Notable {styleEntry.name}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {watchGroups.map((watch) => (
                <Link
                  key={watch.watchId}
                  href={`/w/${watch.watchId}`}
                  className="group block rounded-xl overflow-hidden border border-gray-100 hover:border-gray-300 transition-colors"
                >
                  <div className="aspect-square bg-gray-50 overflow-hidden relative">
                    <Image
                      src={watch.thumbnailUrl ?? watch.url}
                      alt={`${watch.brandName ?? ''} ${watch.modelName ?? ''} wrist photo`.trim()}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                  </div>
                  <div className="px-2.5 py-2">
                    <p className="text-xs font-medium text-gray-700 truncate">
                      {[watch.brandName, watch.modelName].filter(Boolean).join(' ') || 'Unknown model'}
                    </p>
                    <p className="text-xs text-gray-400">{watch.photoCount} photo{watch.photoCount !== 1 ? 's' : ''}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Recent photos */}
        {recentPhotos.length > 0 && (
          <div className="mb-10">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Recent {styleEntry.name.toLowerCase()} photos
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {recentPhotos.map((photo) => (
                <Link
                  key={photo.id}
                  href={`/photo/${photo.slug ?? photo.id}`}
                  className="group block rounded-xl overflow-hidden border border-gray-100 hover:border-gray-300 transition-colors"
                >
                  <div className="aspect-square bg-gray-50 overflow-hidden relative">
                    <Image
                      src={photo.thumbnailUrl ?? photo.url}
                      alt={buildPhotoAltText(photo)}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                  </div>
                  <div className="px-2.5 py-2">
                    <p className="text-xs text-gray-500 truncate">by {photo.userName}</p>
                    {photo.caseSize && (
                      <p className="text-xs text-gray-400">{photo.caseSize}mm</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* FAQ */}
        {styleEntry.faq.length > 0 && (
          <div className="mb-10">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {styleEntry.name} — common questions
            </h2>
            <div className="space-y-4">
              {styleEntry.faq.map((item, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 p-5">
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">{item.question}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Link
            href="/styles"
            className="text-sm text-gray-500 hover:text-gray-800 underline underline-offset-2 transition-colors"
          >
            ← All styles
          </Link>
          <Link
            href="/upload"
            className="text-sm font-medium text-white bg-gray-900 hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors"
          >
            Upload your {styleEntry.name.toLowerCase()}
          </Link>
        </div>

      </main>
    </>
  )
}
