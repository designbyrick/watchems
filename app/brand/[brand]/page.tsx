export const dynamic = 'force-dynamic'
export const revalidate = 0

import { cache } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { db } from '@/lib/db'
import { photos } from '@/lib/db/schema'
import { eq, and, asc, desc, sql, isNotNull, inArray } from 'drizzle-orm'
import { brands as brandDataList } from '@/lib/brandData'
import { brandSlug } from '@/lib/brandSlug'
import { getAllGuides } from '@/lib/buyingGuides'
import BrandPhotoCard from './BrandPhotoCard'
import { serializeJsonLd } from '@/lib/jsonLd'

interface BrandPageProps {
  params: Promise<{ brand: string }>
  searchParams: Promise<{ model?: string | string[] }>
}

const GRID_LIMIT = 48
const CHIP_LIMIT = 8
// Brands with fewer approved photos than this stay crawlable but out of the index
const MIN_PHOTOS_FOR_INDEX = 3

// Every stored spelling of the brand whose slug matches the URL ("Grand Seiko", "GRAND SEIKO", …).
// Middleware already 301s non-canonical variants, so params.brand is the lowercase hyphenated slug.
const resolveBrandNames = cache(async (slug: string): Promise<string[]> => {
  const rows = await db
    .selectDistinct({ brandName: photos.brandName })
    .from(photos)
    .where(and(eq(photos.status, 'approved'), isNotNull(photos.brandName)))
  return rows
    .map((r) => r.brandName)
    .filter((name): name is string => !!name && brandSlug(name) === slug)
})

export async function generateMetadata(props: BrandPageProps): Promise<Metadata> {
  const params = await props.params
  const brand = params.brand
  const brandNames = await resolveBrandNames(brand)
  if (brandNames.length === 0) return { title: 'Brand Not Found' }

  const stats = await db
    .select({ photoCount: sql<number>`count(*)::int` })
    .from(photos)
    .where(and(eq(photos.status, 'approved'), inArray(photos.brandName, brandNames)))
    .then((r) => r[0])

  if (!stats || stats.photoCount === 0) return { title: 'Brand Not Found' }

  const repPhoto = await db
    .select({ brandName: photos.brandName, thumbnailUrl: photos.thumbnailUrl, url: photos.url })
    .from(photos)
    .where(and(eq(photos.status, 'approved'), inArray(photos.brandName, brandNames)))
    .orderBy(asc(photos.sortOrder), asc(photos.createdAt))
    .limit(1)
    .then((r) => r[0])

  const canonicalBrandName = repPhoto?.brandName || brandNames[0]
  const imageUrl = repPhoto?.thumbnailUrl || repPhoto?.url || ''

  // Top 3 model names for richer description
  const topModelsForMeta = await db
    .select({ modelName: photos.modelName })
    .from(photos)
    .where(and(eq(photos.status, 'approved'), inArray(photos.brandName, brandNames), isNotNull(photos.modelName)))
    .groupBy(photos.modelName)
    .orderBy(sql`count(*) DESC`)
    .limit(3)

  const modelList = topModelsForMeta.map((m) => m.modelName).filter(Boolean).join(', ')

  const title = `${canonicalBrandName} Watches — Real Wrist Photos & Models`
  const description = modelList
    ? `Browse ${stats.photoCount} real owner wrist photos of ${canonicalBrandName} watches including the ${modelList}. Community-submitted, no affiliate links — just real ${canonicalBrandName} watches on real wrists.`
    : `Browse ${stats.photoCount} real owner wrist photos of ${canonicalBrandName} watches worn on the wrist. Community-submitted, no affiliate links.`

  return {
    title,
    description,
    robots: stats.photoCount < MIN_PHOTOS_FOR_INDEX ? { index: false, follow: true } : { index: true, follow: true },
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

export default async function BrandPage(props: BrandPageProps) {
  const params = await props.params
  const searchParams = await props.searchParams
  const brand = params.brand
  const brandNames = await resolveBrandNames(brand)
  if (brandNames.length === 0) notFound()

  // Stats + guard
  const stats = await db
    .select({ photoCount: sql<number>`count(*)::int` })
    .from(photos)
    .where(and(eq(photos.status, 'approved'), inArray(photos.brandName, brandNames)))
    .then((r) => r[0])

  if (!stats || stats.photoCount === 0) notFound()

  // Cover photo (for OG + structured data)
  const repPhoto = await db
    .select({ brandName: photos.brandName, thumbnailUrl: photos.thumbnailUrl, url: photos.url })
    .from(photos)
    .where(and(eq(photos.status, 'approved'), inArray(photos.brandName, brandNames)))
    .orderBy(asc(photos.sortOrder), asc(photos.createdAt))
    .limit(1)
    .then((r) => r[0])

  if (!repPhoto) notFound()

  const canonicalBrandName = repPhoto.brandName || brandNames[0]
  const imageUrl = repPhoto.thumbnailUrl || repPhoto.url

  const brandWhere = and(eq(photos.status, 'approved'), inArray(photos.brandName, brandNames))

  // Model chips: the brand's most-photographed model names
  const [topModels, modelTotal] = await Promise.all([
    db
      .select({ modelName: photos.modelName, photoCount: sql<number>`count(*)::int` })
      .from(photos)
      .where(and(brandWhere, isNotNull(photos.modelName)))
      .groupBy(photos.modelName)
      .orderBy(sql`count(*) DESC`)
      .limit(CHIP_LIMIT),
    db
      .select({ n: sql<number>`count(distinct lower(${photos.modelName}))::int` })
      .from(photos)
      .where(brandWhere)
      .then((r) => r[0]?.n ?? 0),
  ])

  const requestedModel = Array.isArray(searchParams.model) ? searchParams.model[0] : searchParams.model
  const activeModel = requestedModel
    ? topModels.find((m) => m.modelName?.toLowerCase() === requestedModel.toLowerCase())?.modelName ?? null
    : null

  // One tile per owner's watch, newest first
  const gridRows = await db
    .selectDistinctOn([photos.watchId, photos.userId], {
      id: photos.id,
      slug: photos.slug,
      url: photos.url,
      thumbnailUrl: photos.thumbnailUrl,
      brandName: photos.brandName,
      modelName: photos.modelName,
      referenceNumber: photos.referenceNumber,
      watchId: photos.watchId,
      createdAt: photos.createdAt,
    })
    .from(photos)
    .where(activeModel ? and(brandWhere, eq(photos.modelName, activeModel)) : brandWhere)
    .orderBy(photos.watchId, photos.userId, asc(photos.sortOrder), desc(photos.createdAt))
  const gridPhotos = gridRows
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, GRID_LIMIT)

  // Guide picks for this brand (read-only from the guide data)
  const guideRows = getAllGuides().flatMap((guide) =>
    guide.notableModels
      .filter((m) => m.brandName.toLowerCase() === canonicalBrandName.toLowerCase())
      .map((m) => ({ ...m, guideSlug: guide.slug, tier: guide.shortLabel })),
  )

  // Editorial content from brandData if available
  const brandData = brandDataList.find((b) => b.slug === brand) ?? null

  const pageTitle = `${canonicalBrandName} Watches — Real Wrist Photos & Models`

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

      <div className="max-w-[1320px] mx-auto px-4 sm:px-8 pt-6 sm:pt-10 pb-16 sm:pb-[72px]">

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex flex-wrap gap-2 font-mono text-xs tracking-[1px] uppercase text-muted">
          <Link href="/" className="hover:text-ink transition-colors">Gallery</Link>
          <span aria-hidden="true">/</span>
          <Link href="/brands" className="hover:text-ink transition-colors">Brands</Link>
          <span aria-hidden="true">/</span>
          <span className="text-ink" aria-current="page">{canonicalBrandName}</span>
        </nav>

        {/* Header */}
        <section className="mt-4 flex flex-wrap gap-6 items-end justify-between pb-6 sm:pb-7 border-b border-line">
          <div className="min-w-0">
            <h1 className="text-5xl sm:text-[72px] leading-none font-semibold tracking-[-0.042em] text-ink break-words">
              {canonicalBrandName}
            </h1>
            <p className="mt-3.5 text-[15px] sm:text-[17px] text-muted">
              {[
                brandData?.country,
                `${stats.photoCount} wrist shot${stats.photoCount !== 1 ? 's' : ''}`,
                modelTotal > 0 ? `${modelTotal} model${modelTotal !== 1 ? 's' : ''}` : null,
              ].filter(Boolean).join(' · ')}
            </p>
          </div>
          <Link
            href="/upload"
            className="h-12 rounded-full border border-ink flex items-center px-5 text-[15px] font-semibold text-ink hover:bg-ink hover:text-white transition-colors"
          >
            Add your {canonicalBrandName}
          </Link>
        </section>

        {/* Model chips */}
        {topModels.length > 1 && (
          <div role="group" aria-label="Models" className="mt-5 flex gap-2 overflow-x-auto sm:flex-wrap -mx-4 px-4 sm:mx-0 sm:px-0 [scrollbar-width:none]">
            {[{ modelName: null as string | null, label: 'All models' }, ...topModels.map((m) => ({ modelName: m.modelName, label: m.modelName ?? '' }))].map((chip) => {
              const active = chip.modelName === activeModel
              const href = chip.modelName
                ? `/brand/${brand}?model=${encodeURIComponent(chip.modelName)}`
                : `/brand/${brand}`
              return (
                <Link
                  key={chip.label}
                  href={href}
                  scroll={false}
                  aria-current={active ? 'true' : undefined}
                  className={`shrink-0 h-10 rounded-full border px-4 flex items-center text-sm whitespace-nowrap transition-colors ${
                    active
                      ? 'border-ink bg-ink text-white font-semibold'
                      : 'border-line bg-surface text-ink font-medium hover:border-line-strong'
                  }`}
                >
                  {chip.label}
                </Link>
              )
            })}
          </div>
        )}

        {/* Photo grid */}
        <div className="mt-7 grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(232px,1fr))] gap-x-3 gap-y-7 sm:gap-x-5 sm:gap-y-9">
          {gridPhotos.map((photo, i) => (
            <BrandPhotoCard key={photo.id} photo={photo} brandLabel={canonicalBrandName} eager={i < 6} />
          ))}
          <Link
            href="/upload"
            className="flex flex-col items-center justify-center gap-2.5 aspect-[4/5] border-[1.5px] border-dashed border-line-strong rounded-md text-muted text-center p-6 hover:border-ink hover:text-ink transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
            <span className="text-[15px] font-semibold text-ink">Own a {canonicalBrandName}?</span>
            <span className="text-[13px]">Add your wrist shot</span>
          </Link>
        </div>

        {/* Buying guides */}
        {guideRows.length > 0 && (
          <section aria-labelledby="brand-guides" className="mt-16">
            <div className="flex justify-between items-baseline gap-4 pb-3.5 border-b border-line">
              <h2 id="brand-guides" className="text-[22px] sm:text-[26px] font-semibold tracking-[-0.8px] text-ink">
                {canonicalBrandName} in our buying guides
              </h2>
              <Link href="/buying-guides" className="shrink-0 font-mono text-xs tracking-[1px] uppercase text-muted hover:text-ink transition-colors">
                All guides →
              </Link>
            </div>
            {guideRows.map((row) => (
              <Link
                key={`${row.guideSlug}-${row.name}`}
                href={`/buying-guide/${row.guideSlug}`}
                className="grid grid-cols-[minmax(0,1fr)_24px] sm:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,1fr)_24px] gap-x-4 gap-y-1 items-center py-[18px] px-2 border-b border-line hover:bg-[#FAFAF9] transition-colors"
              >
                <span className="text-[17px] font-semibold text-ink">{row.name}</span>
                <svg className="sm:order-last row-span-3 sm:row-span-1 text-ink" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
                <span className="text-[15px] text-muted">{row.bestFor}</span>
                <span className="font-mono text-[13px] text-ink">{row.price} · {row.tier}</span>
              </Link>
            ))}
          </section>
        )}

        {/* About the brand (editorial content from brandData) */}
        {brandData && (
          <section aria-labelledby="brand-about" className="mt-16 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-12 pt-6 border-t border-line">
            <div>
              <p className="font-mono text-xs tracking-[1px] uppercase text-muted">Founded {brandData.founded} · {brandData.country}</p>
              <h2 id="brand-about" className="mt-2 text-[22px] sm:text-[26px] font-semibold tracking-[-0.8px] text-ink">
                About {canonicalBrandName}
              </h2>
            </div>
            <div>
              {brandData.heroFact && (
                <p className="brand-hero-fact text-[17px] font-medium leading-snug text-ink">{brandData.heroFact}</p>
              )}
              <p className="brand-overview mt-3 text-[15px] leading-relaxed text-muted">{brandData.overview}</p>
            </div>
          </section>
        )}

        {/* FAQ section */}
        {brandData && brandData.faq.length > 0 && (
          <section aria-labelledby="brand-faq" className="mt-16">
            <h2 id="brand-faq" className="pb-3.5 border-b border-line text-[22px] sm:text-[26px] font-semibold tracking-[-0.8px] text-ink">
              {canonicalBrandName}: common questions
            </h2>
            <div>
              {brandData.faq.map((item, i) => (
                <details key={i} className="group border-b border-line" open={i === 0}>
                  <summary className="flex items-center justify-between gap-4 py-[18px] px-2 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                    <h3 className="text-[17px] font-semibold text-ink">{item.question}</h3>
                    <svg className="shrink-0 text-ink transition-transform group-open:rotate-45" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
                  </summary>
                  <p className="faq-answer px-2 pb-5 -mt-1 max-w-3xl text-[15px] leading-relaxed text-muted">{item.answer}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        <div className="mt-12">
          <Link href="/brands" className="font-mono text-xs tracking-[1px] uppercase text-muted hover:text-ink transition-colors">
            ← All brands
          </Link>
        </div>

      </div>
    </>
  )
}
