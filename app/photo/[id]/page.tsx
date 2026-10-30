export const dynamic = 'force-dynamic'
export const revalidate = 0

import { cache } from 'react'
import { notFound, permanentRedirect } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { buildPhotoAltText } from '@/lib/photoAlt'
import { db } from '@/lib/db'
import { photos } from '@/lib/db/schema'
import { or, and, ne, asc, desc, eq, sql, count } from 'drizzle-orm'
import { getStyleByDbValue } from '@/lib/styleData'
import SaveToBoard from '@/components/SaveToBoard'
import SocialActions from '@/components/home/SocialActions'
import PhotoViewer from '@/components/photo/PhotoViewer'

interface PhotoPageProps {
  params: { id: string }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Swatch colours for the spec-sheet dial dot (keys are lowercase dialColor values)
const DIAL_SWATCHES: Record<string, string> = {
  black: '#111213',
  blue: '#27466F',
  white: '#ECEBE6',
  gray: '#707376',
  grey: '#707376',
  silver: '#C4C6C8',
  champagne: '#CDB48A',
  cream: '#E9DFC6',
  green: '#2F5D46',
  brown: '#6B4A33',
  gold: '#C9A43E',
  red: '#9E2B25',
  orange: '#D9662B',
  yellow: '#E3C547',
  purple: '#5B3F7A',
  pink: '#D9A0AE',
  salmon: '#E39C83',
  skeleton: '#9B9B98',
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

/** Free-text measurement columns: append the unit when the uploader typed a bare number */
function withUnit(value: string | null, unit: string) {
  if (!value) return null
  const v = value.trim()
  return /^\d+(\.\d+)?$/.test(v) ? `${v} ${unit}` : v
}

const relatedSelect = {
  id: photos.id,
  slug: photos.slug,
  url: photos.url,
  thumbnailUrl: photos.thumbnailUrl,
  userId: photos.userId,
  userName: photos.userName,
  watchId: photos.watchId,
  brandName: photos.brandName,
  modelName: photos.modelName,
  referenceNumber: photos.referenceNumber,
}

type RelatedPhoto = {
  id: string
  slug: string | null
  url: string
  thumbnailUrl: string | null
  userId: string
  userName: string
  watchId: string
  brandName: string | null
  modelName: string | null
  referenceNumber: string | null
}

/** One card per upload (watchId + user), skipping the upload being viewed */
function onePerUpload(rows: RelatedPhoto[], current: { watchId: string; userId: string }, limit: number) {
  const seen = new Set([`${current.watchId}::${current.userId}`])
  const out: RelatedPhoto[] = []
  for (const row of rows) {
    const key = `${row.watchId}::${row.userId}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(row)
    if (out.length === limit) break
  }
  return out
}

function unslugify(slug: string) {
  return slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

/** Brand URL segment: lowercase, hyphen-separated (matches the /brand canonical) */
function brandSlug(brandName: string) {
  return brandName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

// Shared by generateMetadata and the page — React cache() dedupes per request
const getPhoto = cache(async (param: string) => {
  const isUUID = UUID_REGEX.test(param)
  const rows = await db
    .select()
    .from(photos)
    .where(isUUID ? eq(photos.id, param) : or(eq(photos.slug, param), eq(photos.id, param))!)
    .limit(1)
  return rows[0] ?? null
})

// The uploader's carousel for this watch (same order as the gallery). Its first
// photo is the primary one — secondary carousel photos canonicalize to it.
const getCarousel = cache(async (watchId: string, userId: string) =>
  db
    .select({ id: photos.id, slug: photos.slug, url: photos.url, thumbnailUrl: photos.thumbnailUrl })
    .from(photos)
    .where(and(eq(photos.watchId, watchId), eq(photos.userId, userId), eq(photos.status, 'approved')))
    .orderBy(asc(photos.sortOrder), asc(photos.createdAt))
)

// Generate dynamic metadata
export async function generateMetadata({ params }: PhotoPageProps): Promise<Metadata> {
  const p = await getPhoto(params.id)

  if (!p || p.status !== 'approved') {
    return { title: 'Photo Not Found' }
  }

  const slug = p.slug ?? p.id
  const brandName = p.brandName || 'Watch'
  const modelName = p.modelName || 'on the wrist'
  // Layout template appends " | Watchems"
  const title = `${brandName} ${modelName} Wrist Photo by ${p.userName}`
  const description = `Real owner photo of the ${brandName} ${modelName}${p.referenceNumber ? ` (ref. ${p.referenceNumber})` : ''} submitted by ${p.userName} on Watchems.${p.caseSize ? ` Case size: ${p.caseSize}.` : ''}${p.movement ? ` Movement: ${p.movement}.` : ''}`
  const imageUrl = p.thumbnailUrl || p.url

  const carousel = await getCarousel(p.watchId, p.userId)
  const primary = carousel[0]
  const canonicalSlug = primary && primary.id !== p.id ? primary.slug ?? primary.id : slug
  const canonicalUrl = `https://watchems.com/photo/${canonicalSlug}`

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: 'website',
      siteName: 'Watchems',
      // No width/height: thumbnails keep the upload's aspect ratio, not 1200×630
      images: [{ url: imageUrl, alt: buildPhotoAltText(p) }],
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
  const p = await getPhoto(param)

  // Soft-deleted photos are answered with 410 Gone by middleware.ts before
  // reaching here; anything else that isn't approved is a 404.
  if (!p || p.status !== 'approved') {
    notFound()
  }

  // UUID accessed directly — permanent (308) redirect to the slug URL
  if (UUID_REGEX.test(param) && p.slug) {
    permanentRedirect(`/photo/${p.slug}`)
  }

  const slug = p.slug ?? p.id
  const brandName = p.brandName || 'Watch'
  const modelName = p.modelName || 'on the wrist'
  const imageUrl = p.thumbnailUrl || p.url
  const brandHref = `/brand/${brandSlug(brandName)}`
  const watchHref = `/w/${p.watchId}`
  const watchName = [p.brandName, p.modelName].filter(Boolean).join(' ') || unslugify(p.watchId)
  const displayModel = p.modelName || p.referenceNumber || unslugify(p.watchId)
  const dialKey = p.dialColor?.trim().toLowerCase() || null

  const RELATED_LIMIT = 10
  const RELATED_POOL = 60
  const approvedOthers = and(eq(photos.status, 'approved'), ne(photos.userId, p.userId))

  const [carousel, shotCountRows, byDial] = await Promise.all([
    getCarousel(p.watchId, p.userId),
    db
      .select({ n: count() })
      .from(photos)
      .where(and(eq(photos.userId, p.userId), eq(photos.status, 'approved'))),
    dialKey
      ? db
          .select(relatedSelect)
          .from(photos)
          .where(and(eq(photos.status, 'approved'), sql`lower(${photos.dialColor}) = ${dialKey}`))
          .orderBy(desc(photos.createdAt))
          .limit(RELATED_POOL)
      : Promise.resolve([] as RelatedPhoto[]),
  ])

  // "More <dial> dials", falling back to the same watch from other owners, then the brand
  let related = onePerUpload(byDial, p, RELATED_LIMIT)
  let relatedTitle = dialKey ? `More ${dialKey} dials` : ''
  let relatedHref = dialKey ? `/?dialColor=${encodeURIComponent(dialKey)}` : '/'
  if (related.length === 0) {
    const sameWatch = await db
      .select(relatedSelect)
      .from(photos)
      .where(and(eq(photos.watchId, p.watchId), approvedOthers))
      .orderBy(asc(photos.sortOrder), desc(photos.createdAt))
      .limit(RELATED_POOL)
    related = onePerUpload(sameWatch, p, RELATED_LIMIT)
    relatedTitle = `More ${watchName}`
    relatedHref = watchHref
  }
  if (related.length === 0 && p.brandName) {
    const sameBrand = await db
      .select(relatedSelect)
      .from(photos)
      .where(and(eq(photos.status, 'approved'), sql`lower(${photos.brandName}) = ${p.brandName.toLowerCase()}`))
      .orderBy(desc(photos.createdAt))
      .limit(RELATED_POOL)
    related = onePerUpload(sameBrand, p, RELATED_LIMIT)
    relatedTitle = `More ${p.brandName}`
    relatedHref = brandHref
  }

  const viewerPhotos = (carousel.length > 0 ? carousel : [{ id: p.id, url: p.url, thumbnailUrl: p.thumbnailUrl }]).map(
    (photo, i) => ({
      id: photo.id,
      url: photo.url,
      thumbnailUrl: photo.thumbnailUrl,
      alt: `${buildPhotoAltText(p)}${carousel.length > 1 ? `, photo ${i + 1}` : ''}`,
    })
  )
  const initialIndex = Math.max(0, viewerPhotos.findIndex((photo) => photo.id === p.id))
  const shotCount = Number(shotCountRows[0]?.n ?? 0)
  const primary = carousel[0]
  const canonicalUrl = `https://watchems.com/photo/${primary && primary.id !== p.id ? primary.slug ?? primary.id : slug}`

  // Spec sheet — rows without a value are hidden
  const specs: { label: string; value: string; swatch?: string }[] = []
  if (p.movement) specs.push({ label: 'Movement', value: p.movement })
  const caseValue = [withUnit(p.caseSize, 'mm'), p.caseMaterial && capitalize(p.caseMaterial)].filter(Boolean).join(' · ')
  if (caseValue) specs.push({ label: 'Case', value: caseValue })
  if (p.dialColor) specs.push({ label: 'Dial', value: capitalize(p.dialColor.trim()), swatch: DIAL_SWATCHES[dialKey ?? ''] ?? '#9B9B98' })
  if (p.strapType) specs.push({ label: 'Strap', value: capitalize(p.strapType.trim()) })
  const wrist = withUnit(p.wristSize, 'mm')
  if (wrist) specs.push({ label: 'Wrist', value: wrist })
  if (p.estimatedPrice) specs.push({ label: 'Est. price', value: p.estimatedPrice })

  // Tag chips — derived from the photo's own attributes
  const style = p.watchStyle ? getStyleByDbValue(p.watchStyle) : undefined
  const tags: { label: string; href?: string }[] = []
  if (p.watchStyle) {
    tags.push({
      label: capitalize(p.watchStyle.trim()),
      href: style ? `/style/${style.slug}` : `/?watchStyle=${encodeURIComponent(p.watchStyle.toLowerCase())}`,
    })
  }
  if (dialKey) tags.push({ label: `${capitalize(dialKey)} dial`, href: `/?dialColor=${encodeURIComponent(dialKey)}` })
  const caseSizeTag = withUnit(p.caseSize, 'mm')
  if (caseSizeTag) tags.push({ label: caseSizeTag })

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

  // Structured data — BreadcrumbList (Gallery → Brand → Watch → Photo), mirrors the visual breadcrumb
  const breadcrumbItems = [
    { name: 'Gallery', item: 'https://watchems.com' },
    ...(p.brandName ? [{ name: p.brandName, item: `https://watchems.com${brandHref}` }] : []),
    { name: watchName, item: `https://watchems.com${watchHref}` },
    { name: `Photo by ${p.userName}`, item: canonicalUrl },
  ]
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems.map((crumb, i) => ({ '@type': 'ListItem', position: i + 1, ...crumb })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(imageJsonLd) }}
      />
      {productJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <main className="max-w-[1320px] mx-auto px-4 sm:px-8 pt-5 sm:pt-9 pb-16 sm:pb-[72px]">
        <nav aria-label="Breadcrumb" className="mb-4 sm:mb-6 flex items-center gap-2 font-mono text-[11px] sm:text-xs tracking-[1px] uppercase text-muted whitespace-nowrap overflow-hidden">
          <Link href="/" className="hover:text-ink transition-colors">Gallery</Link>
          <span aria-hidden="true">/</span>
          {p.brandName && (
            <>
              <Link href={brandHref} className="hover:text-ink transition-colors">{p.brandName}</Link>
              <span aria-hidden="true">/</span>
            </>
          )}
          <Link href={watchHref} className="hover:text-ink transition-colors truncate">
            {[displayModel, p.modelName && p.referenceNumber].filter(Boolean).join(' ')}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-ink truncate" aria-current="page">Photo by {p.userName}</span>
        </nav>

        <div className="flex flex-wrap items-start gap-8 lg:gap-10">
          <div className="flex-[3_1_520px] min-w-0 max-w-full">
            <PhotoViewer
              photos={viewerPhotos}
              initialIndex={initialIndex}
              track={{ watchId: p.watchId, brand: p.brandName, model: p.modelName }}
            />
          </div>

          <aside className="flex-[2_1_380px] min-w-0 max-w-full flex flex-col gap-[26px]">
            <div>
              {p.brandName && (
                <Link href={brandHref} className="font-mono text-[13px] tracking-[1.2px] uppercase text-muted hover:text-ink transition-colors">
                  {p.brandName}
                </Link>
              )}
              <h1 className="mt-2 text-[36px] sm:text-[48px] leading-none font-semibold tracking-[-0.033em] text-ink">
                {displayModel}
              </h1>
              {p.referenceNumber && (
                <p className="mt-3 font-mono text-sm text-muted">Ref. {p.referenceNumber}</p>
              )}
              <Link
                href={watchHref}
                className="mt-4 inline-block text-[15px] font-semibold text-ink shadow-[inset_0_-1px_0_currentColor] hover:text-ink-hover"
              >
                See all photos of the {watchName} →
              </Link>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <SaveToBoard photoId={p.id} variant="button" className="flex-[1_1_160px]" />
              <SocialActions photoId={p.id} photoSlug={slug} variant="detail" />
            </div>

            {specs.length > 0 && (
              <section aria-label="Specifications" className="rounded-[10px] border border-line bg-surface">
                <div className="flex justify-between px-[18px] py-3.5 border-b border-line font-mono text-[11px] tracking-[1.4px] uppercase text-muted">
                  <span>Spec sheet</span>
                  <span>From the uploader</span>
                </div>
                <dl className="px-[18px]">
                  {specs.map((spec, i) => (
                    <div
                      key={spec.label}
                      className={`flex justify-between gap-4 py-[13px] ${i < specs.length - 1 ? 'border-b border-line' : ''}`}
                    >
                      <dt className="font-mono text-xs tracking-[1px] uppercase text-muted shrink-0">{spec.label}</dt>
                      <dd className="text-[15px] font-medium text-right text-ink flex items-center gap-2 min-w-0">
                        {spec.swatch && (
                          <span
                            aria-hidden="true"
                            className="w-3.5 h-3.5 rounded-full shrink-0 shadow-[inset_0_0_0_1px_rgba(127,127,127,0.5)]"
                            style={{ background: spec.swatch }}
                          />
                        )}
                        <span className="break-words">{spec.value}</span>
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            <div className="flex items-center gap-3 pt-1">
              <span aria-hidden="true" className="w-11 h-11 rounded-full border border-line flex items-center justify-center font-semibold text-ink shrink-0">
                {p.userName.trim().charAt(0).toUpperCase() || 'W'}
              </span>
              <div className="flex-grow min-w-0">
                <p className="text-[15px] font-semibold text-ink truncate">Shot by {p.userName}</p>
                <p className="font-mono text-xs text-muted">
                  {shotCount} wrist shot{shotCount !== 1 ? 's' : ''}
                </p>
              </div>
              <Link
                href={`/profile/${p.userId}`}
                className="text-[15px] font-semibold text-ink shadow-[inset_0_-1px_0_currentColor] hover:text-ink-hover shrink-0"
              >
                View collection
              </Link>
            </div>

            {tags.length > 0 && (
              <ul className="flex flex-wrap gap-2" aria-label="Tags">
                {tags.map((tag) => (
                  <li key={tag.label}>
                    {tag.href ? (
                      <Link
                        href={tag.href}
                        className="h-9 rounded-full border border-line flex items-center px-3.5 text-sm text-ink hover:border-line-strong transition-colors"
                      >
                        {tag.label}
                      </Link>
                    ) : (
                      <span className="h-9 rounded-full border border-line flex items-center px-3.5 text-sm text-muted">
                        {tag.label}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <div className="rounded-[10px] border border-line bg-surface px-[18px] py-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[15px] text-ink">Own a {watchName}? Share your wrist shot.</p>
              <Link
                href="/upload"
                className="h-9 rounded-full border border-line-strong flex items-center px-3.5 text-sm font-semibold text-ink hover:border-ink transition-colors shrink-0"
              >
                Upload yours
              </Link>
            </div>
          </aside>
        </div>

        {related.length > 0 && (
          <section aria-labelledby="related-heading">
            <div className="flex justify-between items-baseline gap-4 mt-12 sm:mt-16 mb-5 pt-5 border-t border-line">
              <h2 id="related-heading" className="text-[22px] sm:text-[26px] font-semibold tracking-[-0.6px] text-ink">
                {relatedTitle}
              </h2>
              <Link href={relatedHref} className="font-mono text-xs tracking-[1px] uppercase text-muted hover:text-ink transition-colors shrink-0">
                See all →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-[repeat(auto-fill,minmax(232px,1fr))] sm:gap-x-5 sm:gap-y-8">
              {related.map((photo) => (
                <Link key={photo.id} href={`/photo/${photo.slug ?? photo.id}`} className="group block min-w-0">
                  <div className="aspect-[4/5] overflow-hidden rounded-md bg-surface">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.thumbnailUrl || photo.url}
                      alt={buildPhotoAltText(photo)}
                      className="block w-full h-full object-cover transition-transform duration-[350ms] ease-out group-hover:scale-[1.035]"
                      loading="lazy"
                    />
                  </div>
                  {photo.brandName && (
                    <p className="mt-2 sm:mt-3 font-mono text-[10.5px] sm:text-[11px] tracking-[0.8px] sm:tracking-[1px] uppercase text-muted truncate">
                      {photo.brandName}
                    </p>
                  )}
                  <p className="mt-[3px] sm:mt-1 text-[15px] sm:text-[17px] leading-[1.25] font-semibold tracking-[-0.2px] text-ink">
                    {photo.modelName || photo.referenceNumber || unslugify(photo.watchId)}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  )
}
