export const dynamic = 'force-dynamic'
export const revalidate = 0

import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { db } from '@/lib/db'
import { photos } from '@/lib/db/schema'
import { eq, and, sql, isNotNull } from 'drizzle-orm'
import { serializeJsonLd } from '@/lib/jsonLd'

const MIN_PHOTOS_FOR_HUB = 3

export const metadata: Metadata = {
  title: 'Watch Models — Wrist Photo Gallery',
  description:
    'Browse real owner wrist photos by watch model. Rolex Submariner, Omega Speedmaster, Seiko Prospex and more — community-submitted photos on Watchems.',
  alternates: {
    canonical: 'https://watchems.com/watches',
  },
  openGraph: {
    title: 'Watch Models — Wrist Photo Gallery',
    description:
      'Browse real owner wrist photos by watch model. Community-submitted wrist shots on Watchems.',
    url: 'https://watchems.com/watches',
    type: 'website',
    siteName: 'Watchems',
  },
  twitter: {
    card: 'summary',
    title: 'Watch Models — Wrist Photo Gallery',
    description: 'Browse real owner wrist photos by watch model on Watchems.',
  },
}

export default async function WatchesPage() {
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
    .where(and(eq(photos.status, 'approved'), isNotNull(photos.watchId)))
    .groupBy(photos.watchId, photos.brandName, photos.modelName)
    .having(sql`count(*) >= ${MIN_PHOTOS_FOR_HUB}`)
    .orderBy(sql`count(*) DESC`)

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://watchems.com' },
      { '@type': 'ListItem', position: 2, name: 'Watch Models', item: 'https://watchems.com/watches' },
    ],
  }

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Watch Models on Watchems',
    numberOfItems: watchGroups.length,
    itemListElement: watchGroups.map((w, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: [w.brandName, w.modelName].filter(Boolean).join(' '),
      url: `https://watchems.com/w/${w.watchId}`,
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(itemListJsonLd) }}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* Breadcrumb */}
        <nav className="text-xs text-gray-400 mb-6 flex items-center gap-1.5">
          <Link href="/" className="hover:text-gray-600 transition-colors">Home</Link>
          <span>/</span>
          <span className="text-gray-600">Watch Models</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">Watch Models</h1>
          <p className="text-sm text-gray-500 mt-2">
            Browse real owner wrist photos from {watchGroups.length} watch model{watchGroups.length !== 1 ? 's' : ''} in the Watchems community.
          </p>
        </div>

        {/* Watch model grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {watchGroups.map((watch) => {
            const coverImg = watch.thumbnailUrl ?? watch.url
            const displayName = [watch.brandName, watch.modelName].filter(Boolean).join(' ') || watch.watchId
            return (
              <Link
                key={watch.watchId}
                href={`/w/${watch.watchId}`}
                className="group block rounded-xl overflow-hidden border border-gray-100 hover:border-gray-300 transition-colors"
              >
                <div className="aspect-square bg-gray-50 overflow-hidden relative">
                  <Image
                    src={coverImg}
                    alt={`${displayName} wrist photo`}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                </div>
                <div className="px-2.5 py-2">
                  <p className="text-xs font-semibold text-gray-800 truncate">{displayName}</p>
                  <p className="text-xs text-gray-400">{watch.photoCount} photo{watch.photoCount !== 1 ? 's' : ''}</p>
                </div>
              </Link>
            )
          })}
        </div>

      </div>
    </>
  )
}
