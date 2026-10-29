export const dynamic = 'force-dynamic'
export const revalidate = 0

import { notFound, redirect } from 'next/navigation'
import { NextResponse } from 'next/server'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { buildPhotoAltText } from '@/lib/photoAlt'
import { db } from '@/lib/db'
import { photos } from '@/lib/db/schema'
import { or, and, ne, asc, desc, eq } from 'drizzle-orm'
import HeroSearch from '@/components/home/HeroSearch'
import PhotoGallery from '@/components/home/PhotoGallery'
import SaveToBoard from '@/components/SaveToBoard'
import { serializeJsonLd } from '@/lib/jsonLd'

interface PhotoPageProps {
  params: { id: string }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Generate dynamic metadata
export async function generateMetadata({ params }: PhotoPageProps): Promise<Metadata> {
  const param = params.id
  const isUUID = UUID_REGEX.test(param)

  const photoRecord = await db
    .select()
    .from(photos)
    .where(isUUID ? eq(photos.id, param) : or(eq(photos.slug, param), eq(photos.id, param))!)
    .limit(1)

  if (photoRecord.length === 0 || !['approved'].includes(photoRecord[0].status)) {
    return { title: 'Photo Not Found | Watchems' }
  }

  const p = photoRecord[0]
  const slug = p.slug ?? p.id
  const brandName = p.brandName || 'Watch'
  const modelName = p.modelName || 'on the wrist'
  const title = `${brandName} ${modelName} Wrist Photo by ${p.userName} | Watchems`
  const description = `Real owner photo of the ${brandName} ${modelName}${p.referenceNumber ? ` (ref. ${p.referenceNumber})` : ''} submitted by ${p.userName} on Watchems.${p.caseSize ? ` Case size: ${p.caseSize}.` : ''}${p.movement ? ` Movement: ${p.movement}.` : ''}`
  const imageUrl = p.thumbnailUrl || p.url

  // Find the primary photo in this user's carousel (lowest sortOrder, then earliest createdAt)
  // Secondary carousel photos point their canonical to the primary
  let canonicalSlug = slug
  if (p.userId) {
    const primaryPhoto = await db
      .select({ id: photos.id, slug: photos.slug })
      .from(photos)
      .where(and(eq(photos.watchId, p.watchId), eq(photos.userId, p.userId), eq(photos.status, 'approved')))
      .orderBy(asc(photos.sortOrder), asc(photos.createdAt))
      .limit(1)
    if (primaryPhoto.length > 0 && primaryPhoto[0].id !== p.id) {
      canonicalSlug = primaryPhoto[0].slug ?? primaryPhoto[0].id
    }
  }

  return {
    title,
    description,
    alternates: {
      canonical: `https://watchems.com/photo/${canonicalSlug}`,
    },
    openGraph: {
      title,
      description,
      url: `https://watchems.com/photo/${slug}`,
      type: 'website',
      siteName: 'Watchems',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: buildPhotoAltText(p),
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  }
}

export default async function PhotoPage({ params }: PhotoPageProps) {
  const param = params.id
  const isUUID = UUID_REGEX.test(param)

  const photoRecord = await db
    .select()
    .from(photos)
    .where(isUUID ? eq(photos.id, param) : or(eq(photos.slug, param), eq(photos.id, param))!)
    .limit(1)

  if (photoRecord.length === 0) {
    notFound()
  }

  const p = photoRecord[0]

  // Soft-deleted photos get 410 Gone — tells Google to drop from index immediately
  if (p.status === 'deleted') {
    return NextResponse.json(null, { status: 410 }) as never
  }

  if (p.status !== 'approved') {
    notFound()
  }

  // UUID accessed directly — 301 redirect to slug URL
  if (isUUID && p.slug) {
    redirect(`/photo/${p.slug}`)
  }

  const slug = p.slug ?? p.id
  const brandName = p.brandName || 'Watch'
  const modelName = p.modelName || 'on the wrist'
  const imageUrl = p.thumbnailUrl || p.url

  // Fetch related photos in parallel
  const relatedByWatch = await db
    .select({
      id: photos.id,
      slug: photos.slug,
      url: photos.url,
      thumbnailUrl: photos.thumbnailUrl,
      userName: photos.userName,
      brandName: photos.brandName,
      modelName: photos.modelName,
    })
    .from(photos)
    .where(and(eq(photos.watchId, p.watchId), eq(photos.status, 'approved'), ne(photos.id, p.id)))
    .orderBy(asc(photos.sortOrder), desc(photos.createdAt))
    .limit(6)

  // Structured data — ImageObject
  const imageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    contentUrl: p.url,
    url: `https://watchems.com/photo/${slug}`,
    name: buildPhotoAltText(p),
    description: `On-wrist photo of ${brandName} ${modelName}${p.referenceNumber ? ` (ref. ${p.referenceNumber})` : ''} submitted by ${p.userName} on Watchems.`,
    thumbnailUrl: imageUrl,
    datePublished: p.createdAt.toISOString(),
    creator: {
      '@type': 'Person',
      name: p.userName,
    },
    creditText: p.userName,
    copyrightNotice: `© ${p.userName}, shared on Watchems`,
    license: 'https://creativecommons.org/licenses/by-nc/4.0/',
    acquireLicensePage: 'https://watchems.com/about',
    about: {
      '@type': 'Thing',
      name: `${brandName} ${modelName}`,
    },
  }

  // Structured data — Product (only when we have brand + model)
  // No Offer block — this is a photo gallery, not a commerce page.
  // Product without Offer is valid schema.org and avoids GSC Merchant Listings errors.
  const productJsonLd = p.brandName && p.modelName
    ? {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: `${brandName} ${modelName}`,
        brand: { '@type': 'Brand', name: brandName },
        image: imageUrl,
        url: `https://watchems.com/photo/${slug}`,
        ...(p.referenceNumber && { mpn: p.referenceNumber }),
        description: [
          `${brandName} ${modelName}${p.referenceNumber ? ` (ref. ${p.referenceNumber})` : ''}.`,
          p.movement && `Movement: ${p.movement}.`,
          p.caseSize && `Case size: ${p.caseSize}mm.`,
          p.dialColor && `Dial: ${p.dialColor}.`,
          p.caseMaterial && `Case: ${p.caseMaterial}.`,
          p.waterResistance && `Water resistance: ${p.waterResistance}.`,
        ]
          .filter(Boolean)
          .join(' '),
      }
    : null

  // Structured data — BreadcrumbList
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://watchems.com' },
      {
        '@type': 'ListItem',
        position: 2,
        name: brandName,
        item: `https://watchems.com/brand/${encodeURIComponent(brandName.toLowerCase())}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: `${brandName} ${modelName}`,
        item: `https://watchems.com/photo/${slug}`,
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(imageJsonLd) }}
      />
      {productJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(productJsonLd) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
      />
      <main className="min-h-screen">
        <Suspense>
          <HeroSearch />
          <PhotoGallery initialPhotoSlug={slug} />
        </Suspense>

        {/* SEO content — server-rendered for Google indexing */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              {brandName} {modelName} — Owner Photo
            </h1>
            <p className="text-gray-700 leading-relaxed">
              Real owner photo of the {brandName} {modelName}
              {p.referenceNumber ? ` (ref. ${p.referenceNumber})` : ''}
              {p.watchStyle ? `, a ${p.watchStyle.toLowerCase()} watch` : ''}
              {', worn on the wrist and shared by '}
              {p.userName} on Watchems.
              {p.caseMaterial ? ` The case is made of ${p.caseMaterial.toLowerCase()}` : ''}
              {p.caseSize ? `${p.caseMaterial ? ` measuring ${p.caseSize}mm` : ` Case size: ${p.caseSize}mm`}.` : p.caseMaterial ? '.' : ''}
              {p.dialColor ? ` ${p.dialColor.charAt(0).toUpperCase() + p.dialColor.slice(1)} dial.` : ''}
              {p.strapType ? ` Worn on a ${p.strapType.toLowerCase()} strap.` : ''}
              {p.movement ? ` Movement: ${p.movement}.` : ''}
              {p.waterResistance ? ` Water resistance: ${p.waterResistance}.` : ''}
              {p.wristSize ? ` Wrist size: ${p.wristSize}.` : ''}
            </p>

            {/* Specs table — all available fields */}
            {(p.referenceNumber || p.movement || p.caseSize || p.caseMaterial || p.dialColor ||
              p.strapType || p.waterResistance || p.lugToLug || p.betweenLugs || p.thickness ||
              p.wristSize || p.estimatedPrice) && (
              <dl className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm border-t border-gray-50 pt-4">
                {p.referenceNumber && <><dt className="text-gray-400">Reference</dt><dd className="text-gray-700 font-medium">{p.referenceNumber}</dd></>}
                {p.movement && <><dt className="text-gray-400">Movement</dt><dd className="text-gray-700 font-medium">{p.movement}</dd></>}
                {p.caseSize && <><dt className="text-gray-400">Case diameter</dt><dd className="text-gray-700 font-medium">{p.caseSize}mm</dd></>}
                {p.caseMaterial && <><dt className="text-gray-400">Case material</dt><dd className="text-gray-700 font-medium">{p.caseMaterial}</dd></>}
                {p.dialColor && <><dt className="text-gray-400">Dial color</dt><dd className="text-gray-700 font-medium">{p.dialColor}</dd></>}
                {p.strapType && <><dt className="text-gray-400">Strap type</dt><dd className="text-gray-700 font-medium">{p.strapType}</dd></>}
                {p.waterResistance && <><dt className="text-gray-400">Water resistance</dt><dd className="text-gray-700 font-medium">{p.waterResistance}</dd></>}
                {p.lugToLug && <><dt className="text-gray-400">Lug to lug</dt><dd className="text-gray-700 font-medium">{p.lugToLug}mm</dd></>}
                {p.betweenLugs && <><dt className="text-gray-400">Lug width</dt><dd className="text-gray-700 font-medium">{p.betweenLugs}mm</dd></>}
                {p.thickness && <><dt className="text-gray-400">Thickness</dt><dd className="text-gray-700 font-medium">{p.thickness}mm</dd></>}
                {p.wristSize && <><dt className="text-gray-400">Wrist size</dt><dd className="text-gray-700 font-medium">{p.wristSize}mm</dd></>}
                {p.estimatedPrice && <><dt className="text-gray-400">Est. price</dt><dd className="text-gray-700 font-medium">{p.estimatedPrice}</dd></>}
              </dl>
            )}

            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">
                Submitted by <span className="font-medium text-gray-700">{p.userName}</span>
              </p>
              <SaveToBoard photoId={p.id} variant="button" />
            </div>
          </div>

          {/* Related photos — same watch model */}
          {relatedByWatch.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  More {brandName} {modelName} photos
                </h2>
                {/* Link to hub page once there are enough photos (current + related >= 3) */}
                {relatedByWatch.length >= 2 && p.brandName && p.modelName && (
                  <Link
                    href={`/w/${p.watchId}`}
                    className="text-sm text-gray-500 hover:text-gray-800 underline underline-offset-2 transition-colors"
                  >
                    See all →
                  </Link>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {relatedByWatch.map((photo) => (
                  <Link
                    key={photo.id}
                    href={`/photo/${photo.slug ?? photo.id}`}
                    className="block rounded-lg overflow-hidden border border-gray-100 hover:border-gray-300 transition-colors"
                  >
                    <div className="aspect-square bg-gray-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.thumbnailUrl || photo.url}
                        alt={`${photo.brandName || 'Watch'} ${photo.modelName || ''} by ${photo.userName}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Brand hub link — passes PageRank up the hierarchy */}
          {p.brandName && (
            <p className="mt-6 text-sm text-gray-500">
              Browse all{' '}
              <Link
                href={`/brand/${encodeURIComponent(brandName.toLowerCase())}`}
                className="underline underline-offset-2 hover:text-gray-800 transition-colors"
              >
                {brandName} wrist photos
              </Link>{' '}
              on Watchems.
            </p>
          )}

        </section>
      </main>
    </>
  )
}
