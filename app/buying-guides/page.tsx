import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { getGuideSummaries } from '@/lib/guides'

const guides = getGuideSummaries()

// Show "Prices verified X" only when every guide agrees on the month
const verifiedMonths = Array.from(new Set(guides.map((g) => g.lastVerified)))
const verifiedLabel = verifiedMonths.length === 1 ? verifiedMonths[0] : null

export const metadata: Metadata = {
  title: 'Watch Buying Guides by Price | Watchems',
  description: 'Ranked watch buying guides by budget — the best watches under $100, under $500 and under $1,000, with verified prices, full specs and honest trade-offs.',
  alternates: {
    canonical: 'https://watchems.com/buying-guides',
  },
  openGraph: {
    title: 'Watch Buying Guides by Price | Watchems',
    description: 'Ranked watch buying guides by budget — the best watches under $100, under $500 and under $1,000, with verified prices, full specs and honest trade-offs.',
    url: 'https://watchems.com/buying-guides',
    type: 'website',
    siteName: 'Watchems',
  },
}

export default function BuyingGuidesPage() {
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://watchems.com' },
      { '@type': 'ListItem', position: 2, name: 'Buying Guides', item: 'https://watchems.com/buying-guides' },
    ],
  }

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Watch Buying Guides by Price',
    itemListElement: guides.map((g, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: g.title,
      url: `https://watchems.com/buying-guide/${g.slug}`,
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />

      <main className="max-w-[1320px] mx-auto px-4 sm:px-8 pt-8 sm:pt-12 pb-16 sm:pb-[72px]">
        <section className="max-w-[760px]">
          <p className="font-mono text-xs uppercase tracking-[1px] text-muted">
            Buying guides{verifiedLabel && ` · Prices verified ${verifiedLabel}`}
          </p>
          <h1 className="mt-3 font-heading text-[40px] sm:text-[56px] leading-[1.02] font-semibold tracking-display text-ink">
            What to buy, by budget.
          </h1>
          <p className="mt-4 text-base sm:text-lg leading-[1.55] text-muted">
            Community-researched picks at every price point. No sponsored picks, no editorial agenda.
          </p>
        </section>

        <div className="mt-8 sm:mt-11 grid gap-6 grid-cols-[repeat(auto-fill,minmax(min(340px,100%),1fr))]">
          {guides.map((g, i) => (
            <Link
              key={g.slug}
              href={`/buying-guide/${g.slug}`}
              className="group flex flex-col rounded-[10px] overflow-hidden bg-surface border border-line hover:border-line-strong transition-colors"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-subtle">
                <Image
                  src={g.heroImage}
                  alt=""
                  fill
                  priority={i === 0}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 420px"
                  className="object-cover transition-transform duration-[350ms] ease-out group-hover:scale-[1.03]"
                />
              </div>
              <div className="flex flex-col gap-2.5 px-[22px] pt-[22px] pb-6">
                <div className="flex justify-between gap-3 font-mono text-[11px] uppercase tracking-[1px] text-muted">
                  <span>{g.pickCount} picks, ranked</span>
                  <span>{g.tier}</span>
                </div>
                <h2 className="font-heading text-[26px] leading-[1.15] font-semibold tracking-[-0.8px] text-ink">
                  {g.title}
                </h2>
                <p className="text-[15px] leading-normal text-muted">{g.summary}</p>
              </div>
            </Link>
          ))}
        </div>

        <section className="mt-14 p-6 sm:p-7 rounded-[10px] border border-line bg-surface flex flex-wrap gap-5 items-center justify-between">
          <div className="max-w-[640px]">
            <h2 className="font-heading text-[22px] font-semibold tracking-[-0.5px] text-ink">How we pick</h2>
            <p className="mt-2 text-[15px] leading-[1.55] text-muted">
              Curated by the Watchems team based on enthusiast community research. Not a live data feed.
            </p>
          </div>
          <Link
            href="/about"
            className="h-11 rounded-full border border-ink px-[18px] inline-flex items-center text-[15px] font-semibold text-ink hover:bg-ink hover:text-white transition-colors"
          >
            About Watchems
          </Link>
        </section>
      </main>
    </>
  )
}
