import Link from 'next/link'
import Image from 'next/image'
import { db } from '@/lib/db'
import { photos } from '@/lib/db/schema'
import { eq, desc, and, inArray, sql } from 'drizzle-orm'
import { FaqAccordion } from '@/components/guide/FaqAccordion'
import { getGuideBySlug } from '@/lib/buyingGuides'
import { getGuideSummaries, type BuyingGuideConfig, type RankEntry } from '@/lib/guides'

interface PickPhoto {
  slug: string | null
  id: string
  url: string
  thumbnailUrl: string | null
  brandName: string | null
  modelName: string | null
}

const norm = (s: string) => s.toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim()

// One wrist shot per pick, matched by brand and model name. Exact model matches win, then a
// DB model that contains the pick's model, then the reverse. A photo is used at most once.
function matchPhotos(ranking: RankEntry[], candidates: PickPhoto[]): Map<number, PickPhoto> {
  const used = new Set<string>()
  const result = new Map<number, PickPhoto>()
  const tiers: Array<(db: string, key: string) => boolean> = [
    (d, k) => d === k,
    (d, k) => d.includes(k),
    (d, k) => d.length >= 3 && k.includes(d),
  ]
  for (const test of tiers) {
    for (const row of ranking) {
      if (result.has(row.rank)) continue
      const brand = norm(row.brand)
      const key = norm(row.model)
      const hit = candidates.find(
        (p) => !used.has(p.id) && p.brandName && p.modelName && norm(p.brandName) === brand && test(norm(p.modelName), key),
      )
      if (hit) {
        used.add(hit.id)
        result.set(row.rank, hit)
      }
    }
  }
  return result
}

async function getPickPhotos(ranking: RankEntry[]): Promise<Map<number, PickPhoto>> {
  const brands = Array.from(new Set(ranking.map((r) => r.brand.toLowerCase())))
  try {
    const candidates = await db
      .select({
        id: photos.id,
        slug: photos.slug,
        url: photos.url,
        thumbnailUrl: photos.thumbnailUrl,
        brandName: photos.brandName,
        modelName: photos.modelName,
      })
      .from(photos)
      .where(and(eq(photos.status, 'approved'), inArray(sql`lower(${photos.brandName})`, brands)))
      .orderBy(desc(photos.createdAt))
      .limit(1000)
    return matchPhotos(ranking, candidates)
  } catch (err) {
    // Photos are a bonus on a guide; render the empty tiles rather than fail the page
    console.error('[buying-guide] pick photo lookup failed', err)
    return new Map()
  }
}

const pad = (n: number) => String(n).padStart(2, '0')
const pickId = (rank: number) => `pick-${pad(rank)}`

const mono = 'font-mono uppercase tracking-[1px]'

export default async function BuyingGuideTemplate({ config }: { config: BuyingGuideConfig }) {
  const pickPhotos = await getPickPhotos(config.ranking)

  // Editorial copy and overview from the MDX guide system, where one exists for this slug
  const editorial = getGuideBySlug(config.slug)
  const modelsByName = new Map((editorial?.notableModels ?? []).map((m) => [m.name, m]))
  const overview = (editorial?.overviewMdx ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p && !p.startsWith('#'))

  const picks = config.ranking.map((row) => {
    const gm = row.guideModel ? modelsByName.get(row.guideModel) : undefined
    return {
      ...row,
      name: `${row.brand} ${row.model}`,
      bestFor: row.bestFor ?? gm?.bestFor,
      reason: row.reason ?? gm?.reason,
      tradeoff: row.tradeoff ?? gm?.tradeoff,
      photo: pickPhotos.get(row.rank),
    }
  })

  const overviewHeading = overview.length > 0 ? `What to expect ${config.tier.toLowerCase()}` : 'How this list was built'
  const otherGuides = getGuideSummaries().filter((g) => g.slug !== config.slug)
  const url = `https://watchems.com/buying-guide/${config.slug}`

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://watchems.com' },
      { '@type': 'ListItem', position: 2, name: 'Buying Guides', item: 'https://watchems.com/buying-guides' },
      { '@type': 'ListItem', position: 3, name: config.title, item: url },
    ],
  }

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: config.title,
    numberOfItems: picks.length,
    itemListElement: picks.map((p) => ({
      '@type': 'ListItem',
      position: p.rank,
      name: p.name,
      url: `${url}#${pickId(p.rank)}`,
    })),
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: config.faq.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  }

  const tocLink = 'flex gap-2.5 py-2.5 text-sm text-muted border-b border-line hover:text-ink transition-colors'
  const toc = (
    <ol>
      <li><a href="#overview" className={tocLink}>{overviewHeading}</a></li>
      {picks.map((p) => (
        <li key={p.rank}>
          <a href={`#${pickId(p.rank)}`} className={tocLink}>
            <span className="font-mono text-mark">{pad(p.rank)}</span>
            <span className="min-w-0">{p.name}</span>
          </a>
        </li>
      ))}
      {config.faq.length > 0 && <li><a href="#faq" className={tocLink}>Common questions</a></li>}
    </ol>
  )

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(config.articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <div className="max-w-[1320px] mx-auto px-4 sm:px-8 pt-6 sm:pt-10 pb-16 sm:pb-20">
        <nav aria-label="Breadcrumb" className={`flex gap-2 ${mono} text-xs text-muted`}>
          <Link href="/buying-guides" className="hover:text-ink transition-colors">Buying guides</Link>
          <span aria-hidden="true">/</span>
          <span className="text-ink" aria-current="page">{config.breadcrumbLabel}</span>
        </nav>

        <header className="mt-[18px] max-w-[860px]">
          <h1 className="font-heading text-[40px] sm:text-[64px] leading-[1.02] sm:leading-none font-semibold tracking-display text-ink">
            {config.title}
          </h1>
          <p className="mt-[18px] text-[17px] sm:text-[19px] leading-normal text-muted">{config.subtitle}</p>
          <ul className={`mt-5 flex flex-wrap gap-2 font-mono text-xs uppercase tracking-[0.8px] text-ink`}>
            {[`${picks.length} picks, ranked`, 'No sponsored picks', `Updated ${config.lastVerified}`].map((chip) => (
              <li key={chip} className="h-8 rounded-full border border-line bg-surface inline-flex items-center px-3">{chip}</li>
            ))}
          </ul>
        </header>

        <div className="mt-8 lg:mt-12 lg:flex lg:gap-12 lg:items-start">
          {/* Phones and tablets: collapsible contents */}
          <details className="lg:hidden mb-8 rounded-[10px] border border-line bg-surface px-4 group">
            <summary className={`cursor-pointer list-none flex items-center justify-between py-3.5 ${mono} text-[11px] text-muted`}>
              On this page
              <svg className="w-4 h-4 transition-transform group-open:rotate-180" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </summary>
            <div className="pb-2 [&_li:last-child_a]:border-b-0">{toc}</div>
          </details>

          <aside aria-label="On this page" className="hidden lg:block w-[260px] shrink-0 sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto">
            <div className={`${mono} text-[11px] text-muted pb-2.5 border-b border-line`}>On this page</div>
            {toc}
          </aside>

          <article className="min-w-0 flex-1 max-w-[880px]">
            <section id="overview" className="pb-8 border-b border-line scroll-mt-24">
              <h2 className="font-heading text-[26px] font-semibold tracking-[-0.8px] text-ink">{overviewHeading}</h2>
              {overview.map((p, i) => (
                <p key={i} className="mt-3.5 text-[17px] leading-[1.65] text-ink/90">{p}</p>
              ))}
              <p className={`${overview.length > 0 ? 'mt-5 text-sm' : 'mt-3.5 text-[17px]'} leading-[1.65] text-muted`}>
                {config.sourcesNote}
              </p>
              <p className="mt-3 text-sm text-muted">Specs and prices are approximate. Verify before you buy.</p>
            </section>

            {picks.map((p) => {
              const name = p.name
              const specs = [
                { label: 'Price', value: p.price },
                { label: 'Case', value: p.caseSize },
                { label: 'Water res.', value: p.wr },
                { label: 'Movement', value: p.movement },
              ]
              return (
                <section
                  key={p.rank}
                  id={pickId(p.rank)}
                  aria-labelledby={`${pickId(p.rank)}-name`}
                  className="py-8 border-b border-line flex gap-4 sm:gap-7 scroll-mt-24"
                >
                  {p.photo ? (
                    <Link
                      href={`/photo/${p.photo.slug ?? p.photo.id}`}
                      className="group relative block w-[104px] sm:w-[200px] shrink-0 self-start aspect-[4/5] rounded-md overflow-hidden bg-subtle"
                    >
                      <Image
                        src={p.photo.thumbnailUrl ?? p.photo.url}
                        alt={`${[p.photo.brandName, p.photo.modelName].filter(Boolean).join(' ') || name} on the wrist`}
                        fill
                        sizes="(max-width: 640px) 104px, 200px"
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    </Link>
                  ) : (
                    <Link
                      href="/upload"
                      className="w-[104px] sm:w-[200px] shrink-0 self-start aspect-[4/5] rounded-md border-[1.5px] border-dashed border-line-strong bg-surface flex flex-col items-center justify-center gap-1.5 sm:gap-2 p-2 sm:p-4 text-center text-muted hover:border-ink transition-colors"
                    >
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
                      <span className="text-xs sm:text-[13px] font-semibold text-ink">No wrist shots yet</span>
                      <span className="text-[11px] sm:text-xs">Own one? Add yours</span>
                    </Link>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono text-2xl sm:text-[28px] font-medium leading-none text-mark">{pad(p.rank)}</span>
                      {p.bestFor && (
                        <span className="h-[30px] rounded-full bg-ink text-white inline-flex items-center px-3 text-[13px] font-semibold">
                          {p.bestFor}
                        </span>
                      )}
                    </div>
                    <h3 id={`${pickId(p.rank)}-name`} className="mt-3 font-heading text-2xl sm:text-[28px] leading-[1.15] font-semibold tracking-[-0.8px] text-ink">
                      {name}
                    </h3>
                    <dl className="mt-3.5 grid grid-cols-2 sm:grid-cols-4 border-t border-line">
                      {specs.map((s) => (
                        <div key={s.label} className="py-2.5 pr-3">
                          <dt className={`${mono} text-[11px] text-muted`}>{s.label}</dt>
                          <dd className="mt-1 text-[15px] font-semibold text-ink">{s.value}</dd>
                        </div>
                      ))}
                    </dl>
                    {p.reason && <p className="mt-3.5 text-base leading-relaxed text-ink/90">{p.reason}</p>}
                    {p.tradeoff && (
                      <p className="mt-2.5 text-[15px] leading-[1.55] text-muted">
                        <strong className="font-semibold text-ink">Trade-off:</strong> {p.tradeoff}
                      </p>
                    )}
                    {p.url && (
                      <a
                        href={p.url}
                        target="_blank"
                        rel="nofollow noopener noreferrer"
                        className={`mt-3.5 inline-flex items-center gap-1.5 ${mono} text-[11px] text-muted hover:text-ink transition-colors`}
                      >
                        {p.brand} site <span aria-hidden="true">↗</span>
                      </a>
                    )}
                  </div>
                </section>
              )
            })}

            {config.faq.length > 0 && (
              <section id="faq" aria-labelledby="faq-heading" className="pt-12 scroll-mt-24">
                <h2 id="faq-heading" className="font-heading text-[26px] font-semibold tracking-[-0.8px] text-ink mb-6">Common questions</h2>
                <FaqAccordion items={config.faq} />
              </section>
            )}

            {otherGuides.length > 0 && (
              <section aria-labelledby="more-guides-heading" className="pt-12">
                <h2 id="more-guides-heading" className="font-heading text-[22px] font-semibold tracking-[-0.5px] text-ink mb-5">More buying guides</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {otherGuides.map((g) => (
                    <Link
                      key={g.slug}
                      href={`/buying-guide/${g.slug}`}
                      className="group block rounded-[10px] border border-line bg-surface p-5 hover:border-line-strong transition-colors"
                    >
                      <div className={`flex justify-between gap-3 ${mono} text-[11px] text-muted`}>
                        <span>{g.pickCount} picks, ranked</span>
                        <span>{g.tier}</span>
                      </div>
                      <h3 className="mt-2 font-heading text-lg font-semibold tracking-[-0.4px] text-ink">{g.title}</h3>
                      <p className="mt-1 text-sm text-muted">{g.summary}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </article>
        </div>
      </div>
    </>
  )
}
