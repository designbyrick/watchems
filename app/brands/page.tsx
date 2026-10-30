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

  const totalPhotos = brandGroups.reduce((sum, b) => sum + b.photoCount, 0)

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

      <main className="max-w-[1320px] mx-auto px-4 sm:px-8 pt-6 sm:pt-10 pb-16 sm:pb-[72px]">

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex flex-wrap gap-2 font-mono text-xs tracking-[1px] uppercase text-muted">
          <Link href="/" className="hover:text-ink transition-colors">Gallery</Link>
          <span aria-hidden="true">/</span>
          <span className="text-ink" aria-current="page">Brands</span>
        </nav>

        {/* Header */}
        <section className="mt-4 flex flex-wrap gap-6 items-end justify-between pb-6 sm:pb-7 border-b border-line">
          <div className="min-w-0">
            <h1 className="text-5xl sm:text-[72px] leading-none font-semibold tracking-[-0.042em] text-ink">Brands</h1>
            <p className="mt-3.5 text-[15px] sm:text-[17px] text-muted">
              {brandGroups.length} brand{brandGroups.length !== 1 ? 's' : ''} · {totalPhotos} wrist shot{totalPhotos !== 1 ? 's' : ''}
            </p>
          </div>
          <Link
            href="/upload"
            className="h-12 rounded-full border border-ink flex items-center px-5 text-[15px] font-semibold text-ink hover:bg-ink hover:text-white transition-colors"
          >
            Add your watch
          </Link>
        </section>

        <BrandList brands={brandGroups.map((b) => ({ brandName: b.brandName!, photoCount: b.photoCount }))} />

      </main>
    </>
  )
}
