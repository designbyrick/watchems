export const dynamic = 'force-dynamic'
export const revalidate = 0

import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { db } from '@/lib/db'
import { photos } from '@/lib/db/schema'
import { eq, and, sql, isNotNull } from 'drizzle-orm'
import { getStyleByDbValue } from '@/lib/styleData'
import { serializeJsonLd } from '@/lib/jsonLd'

const MIN_PHOTOS_FOR_HUB = 5

export const metadata: Metadata = {
  title: 'Watch Styles — Dive, Dress, Field, Pilot & More | Watchems',
  description:
    'Browse real owner wrist photos by watch style. Dive watches, dress watches, field watches, pilot watches, chronographs, GMT watches, and more — community-submitted on Watchems.',
  robots: { index: false, follow: false },
  alternates: {
    canonical: 'https://watchems.com/styles',
  },
  openGraph: {
    title: 'Watch Styles — Dive, Dress, Field, Pilot & More | Watchems',
    description:
      'Browse real owner wrist photos by watch style. Dive watches, dress watches, field watches, pilot watches, chronographs, GMT watches, and more.',
    url: 'https://watchems.com/styles',
    type: 'website',
    siteName: 'Watchems',
  },
  twitter: {
    card: 'summary',
    title: 'Watch Styles — Wrist Photo Gallery | Watchems',
    description: 'Browse real owner wrist photos by watch style on Watchems.',
  },
}

export default async function StylesPage() {
  const styleGroups = await db
    .select({
      watchStyle: photos.watchStyle,
      photoCount: sql<number>`count(*)::int`,
      thumbnailUrl: sql<string | null>`min(${photos.thumbnailUrl})`,
      url: sql<string>`min(${photos.url})`,
    })
    .from(photos)
    .where(and(eq(photos.status, 'approved'), isNotNull(photos.watchStyle)))
    .groupBy(photos.watchStyle)
    .having(sql`count(*) >= ${MIN_PHOTOS_FOR_HUB}`)
    .orderBy(sql`count(*) DESC`)

  // Join against styleData to get display names and slugs, filtering out DB noise
  const displayStyles = styleGroups
    .filter((g) => g.watchStyle && getStyleByDbValue(g.watchStyle))
    .map((g) => ({
      ...g,
      styleEntry: getStyleByDbValue(g.watchStyle!)!,
    }))

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://watchems.com' },
      { '@type': 'ListItem', position: 2, name: 'Watch Styles', item: 'https://watchems.com/styles' },
    ],
  }

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Watch Style Categories on Watchems',
    numberOfItems: displayStyles.length,
    itemListElement: displayStyles.map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: s.styleEntry.name,
      url: `https://watchems.com/style/${s.styleEntry.slug}`,
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

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* Breadcrumb */}
        <nav className="text-xs text-gray-400 mb-6 flex items-center gap-1.5">
          <Link href="/" className="hover:text-gray-600 transition-colors">Home</Link>
          <span>/</span>
          <span className="text-gray-600">Styles</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">Watch Styles</h1>
          <p className="text-sm text-gray-500 mt-2">
            Browse real owner wrist photos by watch category — from dive watches to dress watches and everything in between.
          </p>
        </div>

        {/* Style grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {displayStyles.map(({ styleEntry, photoCount, thumbnailUrl, url }) => {
            const coverImg = thumbnailUrl ?? url
            return (
              <Link
                key={styleEntry.slug}
                href={`/style/${styleEntry.slug}`}
                className="group block rounded-xl overflow-hidden border border-gray-100 hover:border-gray-300 transition-colors"
              >
                <div className="aspect-square bg-gray-50 overflow-hidden relative">
                  <Image
                    src={coverImg}
                    alt={`${styleEntry.name} wrist photo`}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                </div>
                <div className="px-2.5 py-2">
                  <p className="text-xs font-semibold text-gray-800 truncate">{styleEntry.name}</p>
                  <p className="text-xs text-gray-400">{photoCount} photo{photoCount !== 1 ? 's' : ''}</p>
                </div>
              </Link>
            )
          })}
        </div>

      </main>
    </>
  )
}
