import Link from 'next/link'
import Image from 'next/image'
import { db } from '@/lib/db'
import { photos } from '@/lib/db/schema'
import { eq, desc, or, ilike, and } from 'drizzle-orm'
import { FaqAccordion } from '@/components/guide/FaqAccordion'
import { VotableRankingTable } from '@/components/guide/VotableRankingTable'
import { t } from '@/lib/styles'

export interface RankEntry {
  rank: number
  brand: string
  model: string
  price: string
  caseSize: string
  thickness: string
  movement: string
  crystal: string
  wr: string
  url?: string
}

export interface FaqEntry {
  question: string
  answer: string
}

export interface BuyingGuideConfig {
  slug: string
  title: string
  subtitle: string
  breadcrumbLabel: string
  heroImage: string
  proofStats: { stat: string; label: string }[]
  rankingHeading: string
  rankingSubtitle: string
  sourcesNote: string
  ranking: RankEntry[]
  faq: FaqEntry[]
  galleryBrands: string[]
  prevGuide?: { href: string; label: string }
  nextGuide?: { href: string; label: string }
  articleJsonLd: Record<string, unknown>
}

export default async function BuyingGuideTemplate({ config }: { config: BuyingGuideConfig }) {
  const brandConditions = config.galleryBrands.map((b) => ilike(photos.brandName, b))

  const galleryPhotos = await db
    .select({
      id: photos.id,
      slug: photos.slug,
      url: photos.url,
      thumbnailUrl: photos.thumbnailUrl,
      brandName: photos.brandName,
      modelName: photos.modelName,
    })
    .from(photos)
    .where(and(eq(photos.status, 'approved'), or(...brandConditions)))
    .orderBy(desc(photos.createdAt))
    .limit(8)

  // Static registry of all buying guides — update when adding new guides
  const ALL_GUIDES = [
    { slug: 'under-100', shortLabel: 'Under $100', name: 'Best Watches Under $100' },
    { slug: 'under-500', shortLabel: 'Under $500', name: 'Best Watches Under $500' },
    { slug: 'under-1000', shortLabel: 'Under $1,000', name: 'Best Watches Under $1,000' },
  ]
  const otherGuides = ALL_GUIDES.filter((g) => g.slug !== config.slug)

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: config.faq.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(config.articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <main>
        <article>

          {/* ════════════════════════════════════════
              HERO
          ════════════════════════════════════════ */}
          <header>
            <div className="relative w-full h-[60vh] min-h-72 max-h-[520px] overflow-hidden bg-canvas">
              <Image src={config.heroImage} alt={`${config.title} — illustrative image`} fill priority className="object-cover" sizes="100vw" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
              <p className="absolute bottom-2 right-3 text-white/30 text-[10px] leading-none">Illustrative image — AI generated</p>
              <div className="absolute inset-0 flex flex-col justify-end">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-12 w-full">
                  <nav aria-label="Breadcrumb" className="text-white/50 text-xs mb-5 flex items-center gap-1.5">
                    <Link href="/" className="hover:text-white/80 transition-colors">Home</Link>
                    <span>/</span>
                    <Link href="/buying-guides" className="hover:text-white/80 transition-colors">Buying Guides</Link>
                    <span>/</span>
                    <span className="text-white/70">{config.breadcrumbLabel}</span>
                  </nav>
                  <h1 className="font-heading text-3xl sm:text-5xl font-semibold text-white tracking-tight leading-[1.05] mb-4">
                    {config.title}
                  </h1>
                  <p className="text-white/75 text-base sm:text-lg leading-relaxed max-w-2xl">
                    {config.subtitle}
                  </p>
                </div>
              </div>
            </div>

            {/* Proof strip */}
            <div className="bg-surface border-b border-line">
              <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5">
                <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
                  {config.proofStats.map((p) => (
                    <div key={p.label} className="flex items-baseline gap-2">
                      <span className="font-heading text-xl font-semibold text-ink tabular-nums">{p.stat}</span>
                      <span className="text-xs text-faint">{p.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </header>

          {/* ════════════════════════════════════════
              RANKING TABLE
          ════════════════════════════════════════ */}
          <section id="ranking" aria-labelledby="ranking-heading" className="py-16 border-b border-line">
            <div className="max-w-5xl mx-auto px-4 sm:px-6">
              <div className="mb-8">
                <h2 className={t.h2} id="ranking-heading">{config.rankingHeading}</h2>
                <p className="text-sm text-faint mt-1">{config.rankingSubtitle}</p>
              </div>
              <VotableRankingTable rows={config.ranking} guideSlug={config.slug} initialCount={config.ranking.length} />
              <div className="mt-4 flex items-start gap-4 flex-wrap">
                <p className="text-xs text-faint leading-relaxed">Specs and prices are approximate — verify before purchase. No sponsored picks.</p>
                <details className="group shrink-0">
                  <summary className="cursor-pointer list-none flex items-center gap-1.5 text-xs font-medium text-muted hover:text-ink transition-colors select-none">
                    <svg className="w-3.5 h-3.5 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                    How this list was built
                  </summary>
                  <p className="mt-3 text-xs text-muted leading-relaxed max-w-lg">{config.sourcesNote}</p>
                </details>
              </div>
            </div>
          </section>

          {/* ════════════════════════════════════════
              OWNER CTA
          ════════════════════════════════════════ */}
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
            <aside className="rounded-2xl bg-ink px-8 py-10 flex flex-col sm:flex-row sm:items-center gap-6">
              <div className="flex-1">
                <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-2">Own one of these?</p>
                <h2 className="font-heading text-xl font-semibold text-white mb-1">Show it on your wrist.</h2>
                <p className="text-white/70 text-sm leading-relaxed max-w-md">Real owner photos help buyers make better decisions. Add yours to the Watchems community gallery.</p>
              </div>
              <div className="shrink-0">
                <Link href="/upload" className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-white text-ink text-sm font-semibold hover:bg-white/90 transition-colors whitespace-nowrap">
                  Upload your wrist shot
                </Link>
              </div>
            </aside>
          </div>

          {/* ════════════════════════════════════════
              WATCH GALLERY
          ════════════════════════════════════════ */}
          {galleryPhotos.length > 0 && (
            <section aria-label="Watch gallery" className="py-16 border-b border-line bg-canvas">
              <div className="max-w-5xl mx-auto px-4 sm:px-6">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
                  <div>
                    <h2 className={t.h2}>See these watches on the wrist</h2>
                    <p className="text-sm text-faint mt-1">Real owner photos from the Watchems community</p>
                  </div>
                  <Link
                    href="/"
                    className="shrink-0 text-sm font-medium text-muted hover:text-ink transition-colors inline-flex items-center gap-1.5"
                  >
                    Browse the gallery
                    <span aria-hidden="true">→</span>
                  </Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {galleryPhotos.map((photo) => {
                    const src = photo.thumbnailUrl ?? photo.url
                    const label = [photo.brandName, photo.modelName].filter(Boolean).join(' ') || 'Watch'
                    return (
                      <Link
                        key={photo.id}
                        href={`/photo/${photo.slug ?? photo.id}`}
                        className="group block rounded-xl overflow-hidden border border-line hover:border-gray-300 transition-colors"
                      >
                        <div className="aspect-square bg-canvas overflow-hidden relative">
                          <Image
                            src={src}
                            alt={`${label} wrist photo`}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            sizes="(max-width: 640px) 50vw, 25vw"
                          />
                        </div>
                      </Link>
                    )
                  })}
                </div>
                <div className="mt-6">
                  <Link
                    href="/"
                    className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-ink text-white text-sm font-semibold hover:bg-ink/90 transition-colors"
                  >
                    Browse the full gallery
                  </Link>
                </div>
              </div>
            </section>
          )}

          {/* ════════════════════════════════════════
              FAQ
          ════════════════════════════════════════ */}
          <section id="faq" aria-labelledby="faq-heading" className="py-16 border-b border-line [scroll-margin-top:108px]">
            <div className="max-w-5xl mx-auto px-4 sm:px-6">
              <h2 className={`${t.h2} mb-8`} id="faq-heading">Common questions</h2>
              <FaqAccordion items={config.faq} />
            </div>
          </section>

          {/* ════════════════════════════════════════
              MORE BUYING GUIDES
          ════════════════════════════════════════ */}
          {otherGuides.length > 0 && (
            <section aria-labelledby="more-guides-heading" className="py-16 border-b border-line">
              <div className="max-w-5xl mx-auto px-4 sm:px-6">
                <h2 className={`${t.h2} mb-6`} id="more-guides-heading">More buying guides</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {otherGuides.map((guide) => (
                    <Link
                      key={guide.slug}
                      href={`/buying-guide/${guide.slug}`}
                      className="group block rounded-xl border border-line hover:border-gray-300 bg-white p-5 transition-colors"
                    >
                      <p className="text-xs font-medium text-faint uppercase tracking-wide mb-1">{guide.shortLabel}</p>
                      <h3 className="text-base font-semibold text-ink group-hover:text-ink transition-colors mb-1">
                        {guide.name}
                      </h3>
                      <p className="text-xs text-faint mt-2 group-hover:text-muted transition-colors">Read guide →</p>
                    </Link>
                  ))}
                  <Link
                    href="/buying-guides"
                    className="group block rounded-xl border border-dashed border-line hover:border-gray-300 bg-canvas p-5 transition-colors flex flex-col justify-center items-start"
                  >
                    <p className="text-xs font-medium text-faint uppercase tracking-wide mb-1">All guides</p>
                    <h3 className="text-base font-semibold text-muted group-hover:text-ink transition-colors">Browse all buying guides</h3>
                    <p className="text-xs text-faint mt-2 group-hover:text-muted transition-colors">View all →</p>
                  </Link>
                </div>
              </div>
            </section>
          )}

          {/* ════════════════════════════════════════
              FOOTER NAV
          ════════════════════════════════════════ */}
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
            <footer className="flex items-center justify-between gap-4 border-t border-line pt-6">
              <Link href="/buying-guides" className={`${t.meta} hover:text-muted transition-colors inline-flex items-center gap-2`}>
                <span aria-hidden="true">←</span>
                <span>All buying guides</span>
              </Link>
              {config.nextGuide && (
                <Link href={config.nextGuide.href} className={`${t.meta} hover:text-muted transition-colors`}>
                  {config.nextGuide.label} →
                </Link>
              )}
            </footer>
          </div>

        </article>
      </main>
    </>
  )
}
