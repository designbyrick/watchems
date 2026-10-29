export const dynamic = 'force-dynamic'
export const revalidate = 0

import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { db } from '@/lib/db'
import { photos } from '@/lib/db/schema'
import { eq, and, asc, desc } from 'drizzle-orm'
import { buildPhotoAltText } from '@/lib/photoAlt'
import { isValidSlug } from '@/lib/validation'
import { serializeJsonLd } from '@/lib/jsonLd'

// Hub pages only earn their own URL when there are enough photos to be useful.
// Below this threshold we redirect to the gallery filter instead.
const MIN_PHOTOS_FOR_HUB = 3

interface WatchPageProps {
  params: { watchId: string }
}

export async function generateMetadata({ params }: WatchPageProps): Promise<Metadata> {
  if (!isValidSlug(params.watchId)) return { title: 'Watch Photos | Watchems' }

  const rows = await db
    .select({
      brandName: photos.brandName,
      modelName: photos.modelName,
      referenceNumber: photos.referenceNumber,
      thumbnailUrl: photos.thumbnailUrl,
      url: photos.url,
    })
    .from(photos)
    .where(and(eq(photos.watchId, params.watchId), eq(photos.status, 'approved')))
    .orderBy(asc(photos.sortOrder), asc(photos.createdAt))
    .limit(1)

  if (rows.length === 0) return { title: 'Watch Photos | Watchems' }

  const rep = rows[0]
  const brand = rep.brandName || 'Watch'
  const model = rep.modelName || ''
  const watchName = [brand, model].filter(Boolean).join(' ')
  const ref = rep.referenceNumber ? ` (ref. ${rep.referenceNumber})` : ''
  const imageUrl = rep.thumbnailUrl || rep.url

  const title = `${watchName} Wrist Photos | Watchems`
  const description = `Browse real owner wrist photos of the ${watchName}${ref}. Community-submitted photos on Watchems — no affiliate links, just real watches on real wrists.`

  return {
    title,
    description,
    robots: { index: false, follow: false },
    alternates: {
      canonical: `https://watchems.com/w/${params.watchId}`,
    },
    openGraph: {
      title,
      description,
      url: `https://watchems.com/w/${params.watchId}`,
      type: 'website',
      siteName: 'Watchems',
      images: [{ url: imageUrl, width: 1200, height: 630, alt: `${watchName} wrist photo` }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  }
}

export default async function WatchHubPage({ params }: WatchPageProps) {
  if (!isValidSlug(params.watchId)) notFound()

  const allPhotos = await db
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
      movement: photos.movement,
      createdAt: photos.createdAt,
      dialColor: photos.dialColor,
      caseMaterial: photos.caseMaterial,
      strapType: photos.strapType,
      watchStyle: photos.watchStyle,
      waterResistance: photos.waterResistance,
      estimatedPrice: photos.estimatedPrice,
    })
    .from(photos)
    .where(and(eq(photos.watchId, params.watchId), eq(photos.status, 'approved')))
    .orderBy(asc(photos.sortOrder), desc(photos.createdAt))

  // Too few photos — send to gallery filter instead of showing a thin page
  if (allPhotos.length < MIN_PHOTOS_FOR_HUB) {
    redirect(`/?watch=${encodeURIComponent(params.watchId)}`)
  }

  const rep = allPhotos[0]
  const brand = rep.brandName || 'Watch'
  const model = rep.modelName || ''
  const watchName = [brand, model].filter(Boolean).join(' ')
  const ref = rep.referenceNumber ? ` (ref. ${rep.referenceNumber})` : ''

  // Structured data
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://watchems.com' },
      { '@type': 'ListItem', position: 2, name: brand, item: `https://watchems.com/brand/${encodeURIComponent(brand.toLowerCase())}` },
      { '@type': 'ListItem', position: 3, name: watchName, item: `https://watchems.com/w/${params.watchId}` },
    ],
  }

  const collectionPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${watchName} Wrist Photos`,
    description: `Real owner wrist photos of the ${watchName}${ref} on Watchems.`,
    url: `https://watchems.com/w/${params.watchId}`,
    numberOfItems: allPhotos.length,
    image: rep.thumbnailUrl || rep.url,
  }

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

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* Breadcrumb */}
        <nav className="text-xs text-gray-400 mb-6 flex items-center gap-1.5">
          <Link href="/" className="hover:text-gray-600 transition-colors">Home</Link>
          <span>/</span>
          <Link
            href={`/brand/${encodeURIComponent(brand.toLowerCase())}`}
            className="hover:text-gray-600 transition-colors"
          >
            {brand}
          </Link>
          <span>/</span>
          <span className="text-gray-600">{model || watchName}</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">
            {watchName} Wrist Photos
          </h1>
          {ref && (
            <p className="text-sm text-gray-500 mt-1">{rep.referenceNumber}</p>
          )}
          <p className="text-sm text-gray-500 mt-2">
            {allPhotos.length} owner photo{allPhotos.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Photo grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {allPhotos.map((photo) => (
            <Link
              key={photo.id}
              href={`/photo/${photo.slug ?? photo.id}`}
              className="group block rounded-xl overflow-hidden border border-gray-100 hover:border-gray-300 transition-colors"
            >
              <div className="aspect-square bg-gray-50 overflow-hidden relative">
                <Image
                  src={photo.thumbnailUrl || photo.url}
                  alt={buildPhotoAltText(photo)}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
              </div>
              <div className="px-2.5 py-2">
                <p className="text-xs text-gray-500 truncate">by {photo.userName}</p>
                {photo.caseSize && (
                  <p className="text-xs text-gray-400 truncate">{photo.caseSize}mm</p>
                )}
              </div>
            </Link>
          ))}
        </div>

        {/* Specs summary — all available fields from representative photo */}
        {(rep.movement || rep.caseSize || rep.caseMaterial || rep.dialColor ||
          rep.strapType || rep.waterResistance || rep.estimatedPrice) && (
          <div className="mt-10 bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Key specs</h2>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm">
              {rep.movement && <><dt className="text-gray-400">Movement</dt><dd className="text-gray-700">{rep.movement}</dd></>}
              {rep.caseSize && <><dt className="text-gray-400">Case size</dt><dd className="text-gray-700">{rep.caseSize}mm</dd></>}
              {rep.caseMaterial && <><dt className="text-gray-400">Case material</dt><dd className="text-gray-700">{rep.caseMaterial}</dd></>}
              {rep.dialColor && <><dt className="text-gray-400">Dial color</dt><dd className="text-gray-700">{rep.dialColor}</dd></>}
              {rep.strapType && <><dt className="text-gray-400">Strap type</dt><dd className="text-gray-700">{rep.strapType}</dd></>}
              {rep.waterResistance && <><dt className="text-gray-400">Water resistance</dt><dd className="text-gray-700">{rep.waterResistance}</dd></>}
              {rep.estimatedPrice && <><dt className="text-gray-400">Est. price</dt><dd className="text-gray-700">{rep.estimatedPrice}</dd></>}
            </dl>
            <p className="mt-4 text-xs text-gray-500 leading-relaxed">
              This gallery shows {allPhotos.length} real owner {allPhotos.length !== 1 ? 'photos' : 'photo'} of the {watchName}{ref}
              {rep.watchStyle ? `, a ${rep.watchStyle.toLowerCase()} watch` : ''}.
              {rep.caseMaterial ? ` The case is made of ${rep.caseMaterial.toLowerCase()}` : ''}
              {rep.caseSize ? `${rep.caseMaterial ? ` measuring ${rep.caseSize}mm` : ` Case size: ${rep.caseSize}mm`}.` : rep.caseMaterial ? '.' : ''}
              {rep.movement ? ` Powered by a ${rep.movement.toLowerCase()} movement.` : ''}
              {rep.waterResistance ? ` Water resistant to ${rep.waterResistance}.` : ''}
              {' '}All photos submitted by verified owners on Watchems.
            </p>
          </div>
        )}

        {/* CTA */}
        <div className="mt-10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Link
            href={`/brand/${encodeURIComponent(brand.toLowerCase())}`}
            className="text-sm text-gray-500 hover:text-gray-800 underline underline-offset-2 transition-colors"
          >
            More {brand} photos →
          </Link>
          <Link
            href="/upload"
            className="text-sm font-medium text-white bg-gray-900 hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors"
          >
            Upload your {watchName}
          </Link>
        </div>

      </main>
    </>
  )
}
