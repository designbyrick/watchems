import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'About Watchems — Real Watch Photos from Real Owners',
  description: 'Watchems is a community photo gallery for watch enthusiasts. Browse and upload real watch photos — no affiliate links, no sponsored content.',
  alternates: {
    canonical: 'https://watchems.com/about',
  },
  openGraph: {
    title: 'About | Watchems',
    description: 'A community photo gallery for watch enthusiasts. Real watches, real owners, no affiliate links.',
    url: 'https://watchems.com/about',
    type: 'website',
  },
}

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://watchems.com' },
    { '@type': 'ListItem', position: 2, name: 'About', item: 'https://watchems.com/about' },
  ],
}

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
    <div className="max-w-3xl mx-auto px-4 sm:px-8 pt-10 pb-16 sm:pt-14">
      <div className="mb-10">
        <p className="font-mono text-xs tracking-[1px] uppercase text-muted">About</p>
        <h1 className="mt-2.5 text-[36px] sm:text-[44px] leading-[1.05] font-semibold tracking-[-1.8px] text-ink">About Watchems</h1>
        <p className="mt-4 text-muted text-[17px] leading-relaxed">A visual reference library of real wrist shots, for watch enthusiasts.</p>
      </div>

      <div className="space-y-4">
        {/* What We Are */}
        <section className="bg-surface border border-line rounded-[10px] p-5 sm:p-7">
          <h2 className="text-[22px] font-semibold tracking-[-0.4px] text-ink mb-3 flex items-baseline gap-3">
            <span className="font-mono text-xs tracking-[1px] text-faint shrink-0">01</span>
            What We Are
          </h2>
          <div className="text-[15px] text-muted space-y-3 leading-relaxed">
            <p>
              Watchems is a community photo gallery for watch enthusiasts. Browse real photos of
              watches worn in real life — from affordable{' '}
              <Link href="/brand/seiko" className="underline underline-offset-2 hover:text-ink transition-colors">Seikos</Link>
              {' '}to luxury{' '}
              <Link href="/brand/rolex" className="underline underline-offset-2 hover:text-ink transition-colors">Rolexes</Link>
              . No affiliate links, no sponsored content, just real watches from real owners.
            </p>
            <p>
              Browse photos by{' '}
              <Link href="/brands" className="underline underline-offset-2 hover:text-ink transition-colors">watch brand</Link>
              , or explore individual models to see how they look on a real wrist before you buy.
            </p>
          </div>
        </section>

        {/* Sharing Your Watch */}
        <section className="bg-surface border border-line rounded-[10px] p-5 sm:p-7">
          <h2 className="text-[22px] font-semibold tracking-[-0.4px] text-ink mb-3 flex items-baseline gap-3">
            <span className="font-mono text-xs tracking-[1px] text-faint shrink-0">02</span>
            Sharing Your Watch
          </h2>
          <div className="text-[15px] text-muted space-y-3 leading-relaxed">
            <p>
              Anyone can upload photos of their watch collection. Sign in with Google or email,
              upload a photo, and it appears in the gallery for other enthusiasts
              to discover. We moderate submissions to keep quality high.
            </p>
          </div>
        </section>

        {/* No Affiliate Links */}
        <section className="bg-surface border border-line rounded-[10px] p-5 sm:p-7">
          <h2 className="text-[22px] font-semibold tracking-[-0.4px] text-ink mb-3 flex items-baseline gap-3">
            <span className="font-mono text-xs tracking-[1px] text-faint shrink-0">03</span>
            No Affiliate Links
          </h2>
          <div className="text-[15px] text-muted space-y-3 leading-relaxed">
            <p>
              We have no affiliate links and no sponsored content. We are fully independent.
              The gallery exists purely to celebrate watch culture.
            </p>
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="bg-surface border border-line rounded-[10px] p-5 sm:p-7">
          <h2 className="text-[22px] font-semibold tracking-[-0.4px] text-ink mb-3 flex items-baseline gap-3">
            <span className="font-mono text-xs tracking-[1px] text-faint shrink-0">04</span>
            Contact
          </h2>
          <div className="text-[15px] text-muted space-y-3">
            <p>
              For questions, feedback, or to report issues:
            </p>
            <p>
              <strong className="text-ink">Email:</strong>{' '}
              <span className="text-ink">hello@watchems.com</span>
            </p>
            <p className="text-faint text-sm">
              We read every email and respond within 48 hours.
            </p>
          </div>
        </section>
      </div>

      {/* CTA */}
      <div className="mt-12 text-center bg-surface border border-line rounded-[10px] p-6 sm:p-8">
        <h3 className="text-ink font-semibold text-[22px] tracking-[-0.4px] mb-2">Share your collection with the community</h3>
        <p className="text-[15px] text-muted mb-6">Upload a photo of your watch or browse what others are wearing</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/upload" className="h-11 px-5 rounded-full bg-ink text-white hover:bg-ink-hover transition-colors flex items-center text-[15px] font-semibold">Add a wrist shot</Link>
          <Link href="/" className="h-11 px-5 rounded-full border border-line text-ink hover:border-line-strong transition-colors flex items-center text-[15px] font-semibold">Browse Gallery</Link>
          <Link href="/brands" className="h-11 px-5 rounded-full border border-line text-ink hover:border-line-strong transition-colors flex items-center text-[15px] font-semibold">Browse by Brand</Link>
        </div>
      </div>
    </div>
    </>
  )
}
