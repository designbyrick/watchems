export const dynamic = 'force-dynamic'
export const revalidate = 0

import type { Metadata } from 'next'
import Link from 'next/link'
import { db } from '@/lib/db'
import { photos } from '@/lib/db/schema'
import { eq, and, sql, isNotNull } from 'drizzle-orm'
import BrandList from './BrandList'
import { serializeJsonLd } from '@/lib/jsonLd'

export const metadata: Metadata = {
  title: 'Watch Brands — Wrist Photo Gallery | Watchems',
  description:
    'Browse real owner wrist photos by watch brand. Rolex, Omega, Seiko, Tudor, and more — community-submitted photos on Watchems.',
  alternates: {
    canonical: 'https://watchems.com/brands',
  },
  openGraph: {
    title: 'Watch Brands — Wrist Photo Gallery | Watchems',
    description:
      'Browse real owner wrist photos by watch brand. Rolex, Omega, Seiko, Tudor, and more — community-submitted photos on Watchems.',
    url: 'https://watchems.com/brands',
    type: 'website',
    siteName: 'Watchems',
  },
  twitter: {
    card: 'summary',
    title: 'Watch Brands — Wrist Photo Gallery | Watchems',
    description: 'Browse real owner wrist photos by watch brand on Watchems.',
  },
}

export default async function BrandsPage() {
  const brandGroups = await db
    .select({
      brandName: photos.brandName,
      photoCount: sql<number>`count(*)::int`,
    })
    .from(photos)
    .where(and(eq(photos.status, 'approved'), isNotNull(photos.brandName)))
    .groupBy(photos.brandName)
    .orderBy(photos.brandName)

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://watchems.com' },
      { '@type': 'ListItem', position: 2, name: 'Brands', item: 'https://watchems.com/brands' },
    ],
  }

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Watch Brands on Watchems',
    numberOfItems: brandGroups.length,
    itemListElement: brandGroups.map((b, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: b.brandName,
      url: `https://watchems.com/brand/${encodeURIComponent(b.brandName!.toLowerCase())}`,
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
          <span className="text-gray-600">Brands</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">Watch Brands</h1>
          <p className="text-sm text-gray-500 mt-2">
            Browse real owner wrist photos from {brandGroups.length} watch brand{brandGroups.length !== 1 ? 's' : ''} in the Watchems community.
          </p>
        </div>

        <BrandList brands={brandGroups.map((b) => ({ brandName: b.brandName!, photoCount: b.photoCount }))} />

      </main>
    </>
  )
}
