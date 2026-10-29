export const dynamic = 'force-dynamic'
export const revalidate = 0

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { db } from '@/lib/db'
import { photos } from '@/lib/db/schema'
import { eq, and, asc, sql, isNotNull, ilike } from 'drizzle-orm'
import { brands as brandDataList } from '@/lib/brandData'
import { toWatchSlug } from '@/lib/normalizeWatch'
import { serializeJsonLd } from '@/lib/jsonLd'

interface BrandPageProps {
  params: { brand: string }
}

export async function generateMetadata({ params }: BrandPageProps): Promise<Metadata> {
  const brand = decodeURIComponent(params.brand)

  const stats = await db
    .select({ photoCount: sql<number>`count(*)::int` })
    .from(photos)
    .where(and(eq(photos.status, 'approved'), ilike(photos.brandName, brand)))
    .then((r) => r[0])

  if (!stats || stats.photoCount === 0) return { title: 'Brand Not Found | Watchems' }

  const repPhoto = await db
    .select({ brandName: photos.brandName, thumbnailUrl: photos.thumbnailUrl, url: photos.url })
    .from(photos)
    .where(and(eq(photos.status, 'approved'), ilike(photos.brandName, brand)))
    .orderBy(asc(photos.sortOrder), asc(photos.createdAt))
    .limit(1)
    .then((r) => r[0])

  const canonicalBrandName = repPhoto?.brandName || brand
  const imageUrl = repPhoto?.thumbnailUrl || repPhoto?.url || ''

  // Top 3 model names for richer description
  const topModelsForMeta = await db
    .select({ modelName: photos.modelName })
    .from(photos)
    .where(and(eq(photos.status, 'approved'), ilike(photos.brandName, brand), isNotNull(photos.modelName)))
    .groupBy(photos.modelName)
    .orderBy(sql`count(*) DESC`)
    .limit(3)

  const modelList = topModelsForMeta.map((m) => m.modelName).filter(Boolean).join(', ')

  const title = `${canonicalBrandName} Watches — Real Wrist Photos & Models | Watchems`
  const description = modelList
    ? `Browse ${stats.photoCount} real owner wrist photos of ${canonicalBrandName} watches including the ${modelList}. Community-submitted, no affiliate links — just real ${canonicalBrandName} watches on real wrists.`
    : `Browse ${stats.photoCount} real owner wrist photos of ${canonicalBrandName} watches worn on the wrist. Community-submitted, no affiliate links.`

  return {
    title,
    description,
    robots: { index: false, follow: false },
    alternates: {
      canonical: `https://watchems.com/brand/${brand}`,
    },
    openGraph: {
      title,
      description,
      url: `https://watchems.com/brand/${brand}`,
      type: 'website',
      siteName: 'Watchems',
      images: imageUrl ? [{ url: imageUrl, width: 1200, height: 630, alt: `${canonicalBrandName} wrist photos` }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: imageUrl ? [imageUrl] : [],
    },
  }
}

export default async function BrandPage({ params }: BrandPageProps) {
  const brand = decodeURIComponent(params.brand)

  // Stats + guard
  const stats = await db
    .select({ photoCount: sql<number>`count(*)::int` })
    .from(photos)
    .where(and(eq(photos.status, 'approved'), ilike(photos.brandName, brand)))
    .then((r) => r[0])

  if (!stats || stats.photoCount === 0) notFound()

  // Cover photo (for OG + structured data)
  const repPhoto = await db
    .select({ brandName: photos.brandName, thumbnailUrl: photos.thumbnailUrl, url: photos.url })
    .from(photos)
    .where(and(eq(photos.status, 'approved'), ilike(photos.brandName, brand)))
    .orderBy(asc(photos.sortOrder), asc(photos.createdAt))
    .limit(1)
    .then((r) => r[0])

  if (!repPhoto) notFound()

  const canonicalBrandName = repPhoto.brandName || brand
  const imageUrl = repPhoto.thumbnailUrl || repPhoto.url

  // Top 8 watch models by photo count (no minimum threshold)
  const topModels = await db
    .select({
      watchId: photos.watchId,
      modelName: photos.modelName,
      photoCount: sql<number>`count(*)::int`,
      thumbnailUrl: sql<string | null>`min(${photos.thumbnailUrl})`,
      url: sql<string>`min(${photos.url})`,
    })
    .from(photos)
    .where(and(eq(photos.status, 'approved'), ilike(photos.brandName, brand), isNotNull(photos.watchId)))
    .groupBy(photos.watchId, photos.modelName)
    .orderBy(sql`count(*) DESC`)
    .limit(8)

  // Editorial content from brandData if available
  const normalizedBrandSlug = toWatchSlug(brand)
  const brandData = brandDataList.find((b) => b.slug === normalizedBrandSlug) ?? null

  const pageTitle = `${canonicalBrandName} Watches — Real Wrist Photos & Models | Watchems`

  // Structured data
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://watchems.com' },
      { '@type': 'ListItem', position: 2, name: 'Brands', item: 'https://watchems.com/brands' },
      { '@type': 'ListItem', position: 3, name: canonicalBrandName, item: `https://watchems.com/brand/${brand}` },
    ],
  }

  const collectionPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${canonicalBrandName} Wrist Photos`,
    description: `Real owner wrist photos of ${canonicalBrandName} watches worn on the wrist, submitted by the Watchems community.`,
    url: `https://watchems.com/brand/${brand}`,
    numberOfItems: stats.photoCount,
    image: imageUrl,
  }

  const faqJsonLd = brandData && brandData.faq.length > 0
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: brandData.faq.map(({ question, answer }) => ({
          '@type': 'Question',
          name: question,
          acceptedAnswer: { '@type': 'Answer', text: answer },
        })),
      }
    : null

  const speakableJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: pageTitle,
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['h1', '.brand-hero-fact', '.brand-overview', '.faq-answer'],
    },
  }

  const organisationJsonLd = brandData
    ? {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: canonicalBrandName,
        foundingDate: String(brandData.founded),
        foundingLocation: { '@type': 'Place', name: brandData.country },
        description: brandData.overview.slice(0, 300),
        url: `https://watchems.com/brand/${brand}`,
      }
    : null

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(collectionPageJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqJsonLd) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(speakableJsonLd) }}
      />
      {organisationJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(organisationJsonLd) }}
        />
      )}

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* Breadcrumb */}
        <nav className="text-xs text-gray-400 mb-6 flex items-center gap-1.5">
          <Link href="/" className="hover:text-gray-600 transition-colors">Home</Link>
          <span>/</span>
          <Link href="/brands" className="hover:text-gray-600 transition-colors">Brands</Link>
          <span>/</span>
          <span className="text-gray-600">{canonicalBrandName}</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">
            {canonicalBrandName} Watches
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            {stats.photoCount} real owner photo{stats.photoCount !== 1 ? 's' : ''} on the wrist
          </p>
        </div>

        {/* Brand overview (editorial content from brandData) */}
        {brandData && (
          <div className="bg-gray-50 rounded-xl border border-gray-100 p-5 mb-8">
            {brandData.heroFact && (
              <p className="brand-hero-fact text-sm font-medium text-gray-700 mb-3 italic">
                &ldquo;{brandData.heroFact}&rdquo;
              </p>
            )}
            <p className="brand-overview text-sm text-gray-600 leading-relaxed">{brandData.overview}</p>
            <p className="text-xs text-gray-400 mt-3">Founded {brandData.founded} · {brandData.country}</p>
          </div>
        )}

        {/* Top models grid — 4×2 */}
        {topModels.length > 0 && (
          <div className="mb-10">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {canonicalBrandName} models
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {topModels.map((watch) => {
                const href = watch.photoCount >= 3
                  ? `/w/${watch.watchId}`
                  : `/?watch=${encodeURIComponent(watch.watchId)}`
                return (
                  <Link
                    key={watch.watchId}
                    href={href}
                    className="group block rounded-xl overflow-hidden border border-gray-100 hover:border-gray-300 transition-colors"
                  >
                    <div className="aspect-square bg-gray-50 overflow-hidden relative">
                      <Image
                        src={watch.thumbnailUrl ?? watch.url}
                        alt={`${canonicalBrandName} ${watch.modelName ?? ''} wrist photo`}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      />
                    </div>
                    <div className="px-2.5 py-2">
                      <p className="text-xs font-medium text-gray-700 truncate">{watch.modelName ?? 'Unknown model'}</p>
                      <p className="text-xs text-gray-400">{watch.photoCount} photo{watch.photoCount !== 1 ? 's' : ''}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* FAQ section */}
        {brandData && brandData.faq.length > 0 && (
          <div className="mb-10">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {canonicalBrandName} — common questions
            </h2>
            <div className="space-y-4">
              {brandData.faq.map((item, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 p-5">
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">{item.question}</h3>
                  <p className="faq-answer text-sm text-gray-600 leading-relaxed">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Link
            href="/brands"
            className="text-sm text-gray-500 hover:text-gray-800 underline underline-offset-2 transition-colors"
          >
            ← All brands
          </Link>
          <Link
            href="/upload"
            className="text-sm font-medium text-white bg-gray-900 hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors"
          >
            Upload your {canonicalBrandName}
          </Link>
        </div>

      </main>
    </>
  )
}
