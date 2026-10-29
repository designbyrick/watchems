export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { getAllGuides, getGuideBySlug, type BuyingGuideData } from '@/lib/buyingGuides'
import { db } from '@/lib/db'
import { photos } from '@/lib/db/schema'
import { eq, and, ilike, or, desc } from 'drizzle-orm'
import { CTAButton } from '@/components/CTAButton'
import { PhotoCarousel } from '@/components/guide/PhotoCarousel'
import { GuideSectionHeader } from '@/components/guide/GuideSectionHeader'
import { GuideSpecBadge } from '@/components/guide/GuideSpecBadge'
import { GuideSubnav } from '@/components/guide/GuideSubnav'
import { FaqAccordion } from '@/components/guide/FaqAccordion'
import MdxContent from '@/app/components/mdx/MdxContent'
import { t, l, c, i, tb } from '@/lib/styles'

interface Props {
  params: { slug: string }
}

export function generateStaticParams() {
  return getAllGuides().map((g) => ({ slug: g.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const entry = getGuideBySlug(params.slug)
  if (!entry) return { title: 'Not Found | Watchems' }

  const title = `${entry.name} — Buying Guide | Watchems`
  const description = `A buying guide for watches ${entry.shortLabel.toLowerCase()}. Notable models for different use cases, what to expect at this price, and honest trade-offs — from the Watchems community.`

  return {
    title,
    description,
    alternates: { canonical: `https://watchems.com/buying-guide/${entry.slug}` },
    openGraph: { title, description, url: `https://watchems.com/buying-guide/${entry.slug}`, type: 'article', siteName: 'Watchems' },
    twitter: { card: 'summary', title, description },
  }
}

export default async function BuyingGuidePage({ params }: Props) {
  const entry = getGuideBySlug(params.slug) as BuyingGuideData
  if (!entry) notFound()

  const allGuides = getAllGuides()
  const otherTiers = allGuides.filter((g) => g.slug !== entry.slug)

  const modelConditions = entry.notableModels.map((m) => {
    const keyword = m.name.replace(m.brandName, '').trim()
    return and(ilike(photos.brandName, m.brandName), ilike(photos.modelName, `%${keyword}%`))
  })

  const allModelPhotos = await db
    .select({ id: photos.id, slug: photos.slug, url: photos.url, thumbnailUrl: photos.thumbnailUrl, brandName: photos.brandName, modelName: photos.modelName })
    .from(photos)
    .where(and(eq(photos.status, 'approved'), or(...modelConditions)))
    .orderBy(desc(photos.createdAt))
    .limit(entry.notableModels.length * 4)

  const photoByModel = new Map<string, typeof allModelPhotos[0]>()
  for (const model of entry.notableModels) {
    const keyword = model.name.replace(model.brandName, '').trim().toLowerCase()
    const match = allModelPhotos.find(
      (p) =>
        p.brandName?.toLowerCase() === model.brandName.toLowerCase() &&
        p.modelName?.toLowerCase().includes(keyword)
    )
    if (match) photoByModel.set(model.name, match)
  }

  const subnavItems = [
    { id: 'glance',     label: 'At a glance' },
    { id: 'who',        label: 'Who it\'s for' },
    { id: 'overview',   label: 'Overview' },
    { id: 'comparison', label: 'Compare' },
    { id: 'picks',      label: 'All picks' },
    { id: 'faq',        label: 'FAQ' },
  ]

  const datePublished = entry.lastUpdated
    ? new Date(`${entry.lastUpdated} 01`).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10)

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://watchems.com' },
      { '@type': 'ListItem', position: 2, name: 'Buying Guides', item: 'https://watchems.com/buying-guides' },
      { '@type': 'ListItem', position: 3, name: entry.name, item: `https://watchems.com/buying-guide/${entry.slug}` },
    ],
  }

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: entry.name,
    description: entry.intro,
    url: `https://watchems.com/buying-guide/${entry.slug}`,
    datePublished,
    dateModified: datePublished,
    image: entry.images.hero,
    author: { '@type': 'Organization', name: 'Watchems Editorial', url: 'https://watchems.com' },
    publisher: { '@type': 'Organization', name: 'Watchems', url: 'https://watchems.com', logo: { '@type': 'ImageObject', url: 'https://watchems.com/logo.svg' } },
    citation: entry.sources.map((s) => ({ '@type': 'CreativeWork', name: s.label, url: s.url })),
  }

  const faqJsonLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: entry.faq.map(({ question, answer }) => ({
      '@type': 'Question', name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  }

  const itemListJsonLd = {
    '@context': 'https://schema.org', '@type': 'ItemList',
    name: `Notable watches ${entry.shortLabel.toLowerCase()}`,
    numberOfItems: entry.notableModels.length,
    itemListElement: entry.notableModels.map((m, idx) => ({
      '@type': 'ListItem', position: idx + 1, name: m.name, description: m.reason,
    })),
  }

  const speakableJsonLd = {
    '@context': 'https://schema.org', '@type': 'SpeakableSpecification',
    cssSelector: ['h1', '.guide-intro', '.glance-list', '.notable-models-list', '.faq-answer'],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(speakableJsonLd) }} />

      <main>
        <article>

          {/* ── HERO IMAGE ── */}
          <figure className="relative w-full h-48 sm:h-64 overflow-hidden bg-canvas m-0">
            <Image
              src={entry.images.hero}
              alt={`${entry.name} — hero`}
              fill
              priority
              className="object-cover"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
          </figure>

          {/* ── ARTICLE HEADER ── */}
          <div className={`${l.page} pt-10 pb-6`}>
            <header>
              <nav aria-label="Breadcrumb" className={`${t.meta} mb-8 flex items-center gap-1.5`}>
                <Link href="/" className="hover:text-muted transition-colors">Home</Link>
                <span aria-hidden="true">/</span>
                <Link href="/buying-guides" className="hover:text-muted transition-colors">Buying Guides</Link>
                <span aria-hidden="true">/</span>
                <span className="text-muted">{entry.shortLabel}</span>
              </nav>

              <p className={`${t.eyebrow} mb-4`}>Watchems Buying Guide</p>
              <h1 className={`${t.h1} mb-5`}>{entry.name}</h1>
              <p className={`guide-intro ${t.intro} mb-6 ${l.prose}`}>{entry.intro}</p>

              <div className={`flex items-center gap-4 ${t.meta} pb-8 border-b border-line`}>
                <time dateTime={datePublished}>Updated {entry.lastUpdated}</time>
                <span className="w-px h-3 bg-line" aria-hidden="true" />
                <span>{entry.notableModels.length} picks verified</span>
                <span className="w-px h-3 bg-line" aria-hidden="true" />
                <span>Watchems Editorial</span>
              </div>
            </header>

            {/* ── OTHER TIERS ── */}
            {otherTiers.length > 0 && (
              <nav aria-label="Other price guides" className="py-4 border-b border-line overflow-x-auto scrollbar-hide">
                <div className="flex items-center gap-1 min-w-max">
                  <span className={`${t.eyebrow} mr-3 shrink-0`}>Other budgets</span>
                  {otherTiers.map((tier) => (
                    <Link key={tier.slug} href={`/buying-guide/${tier.slug}`} className={i.navPill}>
                      {tier.shortLabel}
                    </Link>
                  ))}
                </div>
              </nav>
            )}
          </div>

          {/* ── SUBNAV ── */}
          <GuideSubnav items={subnavItems} />

          <div className={`${l.page} py-10`}>

            {/* ── 1. AT A GLANCE ── */}
            <section id="glance" aria-labelledby="glance-heading" className={l.section}>
              <GuideSectionHeader label="Best picks at a glance" />
              <p className={`${t.body} mb-6 ${l.prose}`}>
                Quick answer if you already know what you need. Each pick is the strongest option for that use case — details in the full breakdown below.
              </p>
              <ul className="glance-list divide-y divide-line border border-line rounded-xl overflow-hidden">
                {entry.pickByUseCase.map((pick) => (
                  <li key={pick.useCase} className="flex items-baseline gap-4 px-5 py-3.5 bg-surface hover:bg-canvas transition-colors">
                    <span className={`${t.meta} w-36 shrink-0`}>{pick.useCase}</span>
                    <span className={t.strong}>{pick.model}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* ── 2. WHO IT'S FOR ── */}
            {entry.whoItIsFor && entry.whoItIsFor.length > 0 && (
              <section id="who" aria-labelledby="who-heading" className={l.section}>
                <GuideSectionHeader label="Who this guide is for" />
                <ul className={`space-y-5 ${l.prose}`}>
                  {entry.whoItIsFor.map((item) => (
                    <li key={item.profile} className="flex gap-4">
                      <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-line-strong shrink-0" aria-hidden="true" />
                      <div>
                        <h3 className={`${t.strong} inline`}>{item.profile}. </h3>
                        <span className={t.body}>{item.description}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* ── 3. OVERVIEW — MDX prose ── */}
            <section id="overview" aria-labelledby="overview-heading" className={l.section}>
              <GuideSectionHeader label="What to know before you buy" />
              <figure className="mb-8 -mx-4 sm:-mx-6">
                <blockquote className="bg-ink px-6 sm:px-8 py-6">
                  <p className="price-hero-fact text-base font-medium text-white leading-relaxed italic">
                    &ldquo;{entry.heroFact}&rdquo;
                  </p>
                </blockquote>
              </figure>
              <div className={`price-overview ${l.prose}`}>
                <MdxContent source={entry.overviewMdx} />
              </div>
            </section>

            {/* ── MID IMAGE ── */}
            {entry.images.mid && (
              <figure className="relative w-full h-56 sm:h-72 overflow-hidden rounded-xl mb-14 bg-canvas">
                <Image
                  src={entry.images.mid}
                  alt={`${entry.name} — editorial`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 768px"
                />
              </figure>
            )}

            {/* ── 4. COMPARISON TABLE ── */}
            <section id="comparison" aria-labelledby="comparison-heading" className={l.section}>
              <GuideSectionHeader label="Side-by-side comparison" />
              <div className={`overflow-x-auto ${c.card}`}>
                <table className="w-full">
                  <caption className="sr-only">Watch specifications comparison for {entry.name}</caption>
                  <thead>
                    <tr className="bg-canvas border-b border-line">
                      <th scope="col" className={`px-4 py-3 text-left ${tb.header} whitespace-nowrap`}>Model</th>
                      <th scope="col" className={`px-4 py-3 text-left ${tb.header} whitespace-nowrap`}>Price</th>
                      <th scope="col" className={`px-4 py-3 text-left ${tb.header} whitespace-nowrap hidden sm:table-cell`}>Case</th>
                      <th scope="col" className={`px-4 py-3 text-left ${tb.header} whitespace-nowrap hidden sm:table-cell`}>WR</th>
                      <th scope="col" className={`px-4 py-3 text-left ${tb.header} whitespace-nowrap hidden md:table-cell`}>Crystal</th>
                      <th scope="col" className={`px-4 py-3 text-left ${tb.header} whitespace-nowrap hidden md:table-cell`}>Movement</th>
                      <th scope="col" className={`px-4 py-3 text-left ${tb.header} whitespace-nowrap`}>Best for</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {entry.notableModels.map((model) => (
                      <tr key={model.name} className={tb.row}>
                        <td className={`px-4 py-3.5 ${tb.cellStrong} whitespace-nowrap`}>{model.name}</td>
                        <td className={`px-4 py-3.5 ${tb.cellStrong} whitespace-nowrap tabular-nums`}>{model.price}</td>
                        <td className={`px-4 py-3.5 ${tb.cell} hidden sm:table-cell whitespace-nowrap`}>{model.caseSize}</td>
                        <td className={`px-4 py-3.5 ${tb.cell} hidden sm:table-cell whitespace-nowrap`}>{model.waterResistance}</td>
                        <td className={`px-4 py-3.5 ${tb.cell} hidden md:table-cell whitespace-nowrap`}>{model.crystal}</td>
                        <td className={`px-4 py-3.5 ${tb.cell} hidden md:table-cell whitespace-nowrap`}>{model.movement}</td>
                        <td className={`px-4 py-3.5 ${t.meta} whitespace-nowrap`}>{model.bestFor}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* ── 5. INDIVIDUAL PICK PROFILES ── */}
            {entry.notableModels.length > 0 && (
              <section id="picks" aria-labelledby="picks-heading" className={l.section}>
                <GuideSectionHeader label="Full breakdown" />
                <ul className="notable-models-list space-y-4">
                  {entry.notableModels.map((model, idx) => {
                    const dbPhoto = photoByModel.get(model.name)
                    const thumbSrc = dbPhoto
                      ? (dbPhoto.thumbnailUrl ?? dbPhoto.url)
                      : model.imageUrl ?? null
                    const thumbHref = dbPhoto ? `/photo/${dbPhoto.slug ?? dbPhoto.id}` : null

                    return (
                      <li key={model.name} className={`${c.cardHover} flex overflow-hidden`}>

                        {/* Thumbnail */}
                        <div className="w-28 sm:w-36 shrink-0 bg-canvas relative">
                          {thumbSrc ? (
                            thumbHref ? (
                              <Link href={thumbHref} className="block w-full h-full">
                                <Image src={thumbSrc} alt={`${model.name} wrist shot`} fill className="object-cover" sizes="144px" />
                              </Link>
                            ) : (
                              <Image src={thumbSrc} alt={model.name} fill className="object-cover" sizes="144px" />
                            )
                          ) : (
                            <Link
                              href="/upload"
                              className="flex flex-col items-center justify-center w-full h-full gap-1 p-3 text-center hover:bg-surface transition-colors"
                              aria-label={`Upload a photo of the ${model.name}`}
                            >
                              <span aria-hidden="true" className="text-lg">📷</span>
                              <span className={`${t.meta} leading-tight`}>Add photo</span>
                            </Link>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 p-4 min-w-0">
                          {/* Header row */}
                          <div className="flex items-start justify-between gap-3 mb-1">
                            <div className="min-w-0">
                              <div className={`${t.meta} mb-0.5`}>{String(idx + 1).padStart(2, '0')}</div>
                              <h3 className={`${t.h3} leading-snug`}>{model.name}</h3>
                            </div>
                            <span className={`${t.strong} shrink-0 tabular-nums`}>{model.price}</span>
                          </div>

                          {/* One-line positioning */}
                          <p className={`${t.eyebrow} mb-3`}>{model.bestFor}</p>

                          {/* Specs */}
                          <div className="flex flex-wrap gap-1 mb-3" role="list" aria-label="Specifications">
                            <GuideSpecBadge label={model.caseSize} />
                            <GuideSpecBadge label={model.waterResistance} />
                            <GuideSpecBadge label={model.crystal} />
                            <GuideSpecBadge label={model.movement} />
                          </div>

                          {/* Value explanation */}
                          <p className={`${t.body} text-sm leading-relaxed mb-2`}>{model.reason}</p>

                          {/* Trade-off */}
                          <p className={`${t.small} leading-relaxed mb-2`}>
                            <span className={`${t.meta} font-semibold not-italic`}>Trade-off: </span>
                            {model.tradeoff}
                          </p>

                          {/* Community signal */}
                          {model.communitySignal && (
                            <p className={`${t.meta} italic leading-relaxed border-l-2 border-line pl-3 mt-2`}>
                              {model.communitySignal}
                            </p>
                          )}

                          {/* Upload CTA */}
                          {!dbPhoto && (
                            <Link href="/upload" className={`mt-3 inline-flex items-center gap-1 ${t.meta} text-ink hover:underline underline-offset-2`}>
                              {model.imageUrl ? 'Own this? Upload your wrist shot →' : 'Own this watch? Upload a photo'}
                            </Link>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}

            {/* ── 6. FAQ ── */}
            {entry.faq.length > 0 && (
              <section id="faq" aria-labelledby="faq-heading" className={l.section}>
                <GuideSectionHeader label="Common questions" />
                <FaqAccordion items={entry.faq} />
              </section>
            )}

            {/* ── COMMUNITY PHOTOS ── */}
            {allModelPhotos.length > 0 && (
              <section aria-label="Community photos" className={l.section}>
                <GuideSectionHeader label="From the community" />
                <PhotoCarousel modelName="" photos={allModelPhotos} />
                <div className="mt-6">
                  <CTAButton priority="primary" size="sm" href="/upload">Upload yours</CTAButton>
                </div>
              </section>
            )}

            {/* ── EXPLORE LINKS ── */}
            {entry.internalLinks.length > 0 && (
              <aside aria-label="Explore related content" className={l.sectionSm}>
                <GuideSectionHeader label="Explore on Watchems" />
                <nav aria-label="Related pages">
                  <ul className="flex flex-wrap gap-2">
                    {entry.internalLinks.map((link) => (
                      <li key={link.href}>
                        <Link href={link.href} className={i.pill}>{link.label}</Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              </aside>
            )}

            {/* ── UPLOAD CTA ── */}
            <aside aria-label="Community contribution" className={l.sectionSm}>
              <div className={c.callout}>
                <p className={`${t.eyebrow} mb-2`}>Own one of these?</p>
                <h2 className={`${t.h3} mb-1`}>Show it on your wrist.</h2>
                <p className={`${t.body} mb-5`}>
                  Real owner photos help buyers make better decisions. Add yours to the Watchems community gallery.
                </p>
                <CTAButton priority="primary" size="md" href="/upload">Upload your wrist shot</CTAButton>
              </div>
            </aside>

            <footer className="pb-4">
              <Link href="/buying-guides" className={`${t.meta} hover:text-muted transition-colors inline-flex items-center gap-2`}>
                <span aria-hidden="true">←</span>
                <span>All buying guides</span>
              </Link>
            </footer>

          </div>
        </article>
      </main>
    </>
  )
}
