import type { Metadata } from 'next'
import Link from 'next/link'
import { serializeJsonLd } from '@/lib/jsonLd'

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
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
      />
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <div className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-textPrimary mb-3">About Watchems</h1>
        <p className="text-textSecond text-lg">A community photo gallery for watch enthusiasts</p>
      </div>

      <div className="space-y-10">
        {/* What We Are */}
        <section className="card p-4 sm:p-7">
          <h2 className="text-2xl font-bold text-textPrimary mb-4 flex items-center gap-3">
            <span className="w-8 h-8 rounded-sm bg-accentLight border border-borderStrong flex items-center justify-center text-accent text-sm font-bold shrink-0">01</span>
            What We Are
          </h2>
          <div className="text-textSecond space-y-3 leading-relaxed">
            <p>
              Watchems is a community photo gallery for watch enthusiasts. Browse real photos of
              watches worn in real life — from affordable{' '}
              <Link href="/brand/seiko" className="underline underline-offset-2 hover:text-textPrimary transition-colors">Seikos</Link>
              {' '}to luxury{' '}
              <Link href="/brand/rolex" className="underline underline-offset-2 hover:text-textPrimary transition-colors">Rolexes</Link>
              . No affiliate links, no sponsored content, just real watches from real owners.
            </p>
            <p>
              Browse photos by{' '}
              <Link href="/brands" className="underline underline-offset-2 hover:text-textPrimary transition-colors">watch brand</Link>
              , or explore individual models to see how they look on a real wrist before you buy.
            </p>
          </div>
        </section>

        {/* Sharing Your Watch */}
        <section className="card p-4 sm:p-7">
          <h2 className="text-2xl font-bold text-textPrimary mb-4 flex items-center gap-3">
            <span className="w-8 h-8 rounded-sm bg-accentLight border border-borderStrong flex items-center justify-center text-accent text-sm font-bold shrink-0">02</span>
            Sharing Your Watch
          </h2>
          <div className="text-textSecond space-y-3 leading-relaxed">
            <p>
              Anyone can upload photos of their watch collection. Sign in with Google or email,
              upload a photo, and it appears in the gallery for other enthusiasts
              to discover. We moderate submissions to keep quality high.
            </p>
          </div>
        </section>

        {/* No Affiliate Links */}
        <section className="card p-4 sm:p-7">
          <h2 className="text-2xl font-bold text-textPrimary mb-4 flex items-center gap-3">
            <span className="w-8 h-8 rounded-sm bg-accentLight border border-borderStrong flex items-center justify-center text-accent text-sm font-bold shrink-0">03</span>
            No Affiliate Links
          </h2>
          <div className="text-textSecond space-y-3 leading-relaxed">
            <p>
              We have no affiliate links and no sponsored content. We are fully independent.
              The gallery exists purely to celebrate watch culture.
            </p>
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="card p-7">
          <h2 className="text-2xl font-bold text-textPrimary mb-4 flex items-center gap-3">
            <span className="w-8 h-8 rounded-sm bg-accentLight border border-borderStrong flex items-center justify-center text-accent text-sm font-bold shrink-0">04</span>
            Contact
          </h2>
          <div className="text-textSecond space-y-3">
            <p>
              For questions, feedback, or to report issues:
            </p>
            <p>
              <strong className="text-textPrimary">Email:</strong>{' '}
              <span className="text-accent">hello@watchems.com</span>
            </p>
            <p className="text-textMuted text-sm">
              We read every email and respond within 48 hours.
            </p>
          </div>
        </section>
      </div>

      {/* CTA */}
      <div className="mt-12 text-center bg-accentLight border border-borderStrong rounded-sm p-8">
        <h3 className="text-textPrimary font-bold text-xl mb-2">Share your collection with the community</h3>
        <p className="text-textSecond mb-5">Upload a photo of your watch or browse what others are wearing</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/upload" className="btn-gold">Upload a Photo</Link>
          <Link href="/" className="btn-outline">Browse Gallery</Link>
          <Link href="/brands" className="btn-outline">Browse by Brand</Link>
        </div>
      </div>
    </div>
    </>
  )
}
