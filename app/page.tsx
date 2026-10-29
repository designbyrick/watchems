import { Suspense } from 'react'
import HeroSearch from '@/components/home/HeroSearch'
import PhotoGallery from '@/components/home/PhotoGallery'
import UploadNudge from '@/components/home/UploadNudge'
import type { Metadata } from 'next'

const faqItems = [
  {
    q: 'What is Watchems?',
    a: 'Watchems is a watch photo gallery and resource. Browse community-submitted photos of watches at every price point — from affordable favourites like Seiko and Casio to luxury brands like Rolex, Omega, and Patek Philippe.',
  },
  {
    q: 'Can I upload my own watch photos?',
    a: 'Yes! Click "Add a wrist shot" to share your watch collection with the community. Sign in with your email or Google account to get started.',
  },
  {
    q: 'Is Watchems free to use?',
    a: 'Yes, Watchems is completely free. We have no affiliate links and no sponsored content. It\'s a pure photo gallery for watch enthusiasts.',
  },
  {
    q: 'What watches are featured?',
    a: 'We feature watches at every price point — from affordable favourites like Seiko, Casio, Orient, and Tissot to mid-range brands like Hamilton, Longines, and Oris, all the way up to Rolex, Omega, Tudor, Breitling, IWC, Cartier, Grand Seiko, and beyond.',
  },
]

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqItems.map((item) => ({
    '@type': 'Question',
    name: item.q,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.a,
    },
  })),
}

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Watchems',
  url: 'https://watchems.com',
  logo: 'https://watchems.com/icon.png',
  description: 'Watchems is a community watch photo gallery featuring photographs and uploads from watch enthusiasts. Browse watches at every price point from Seiko and Casio to Rolex and Patek Philippe, with no affiliate links or sponsored content.',
  knowsAbout: [
    'Watch photography', 'Watch gallery', 'Watch community', 'Luxury watches',
    'Dive watches', 'Dress watches', 'Chronograph watches', 'Watch photos',
    'Watch collection', 'Rolex', 'Omega', 'Tudor', 'Seiko', 'TAG Heuer', 'Grand Seiko',
  ],
  sameAs: [],
}

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Watchems',
  url: 'https://watchems.com',
  description: 'Community watch photo gallery featuring photos of watches at every price point.',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: 'https://watchems.com?q={search_term_string}',
    },
    'query-input': 'required name=search_term_string',
  },
}

export const metadata: Metadata = {
  title: 'Watch Photo Gallery | Watchems',
  description:
    'Browse a community-curated gallery of watches at every price point. Upload your own watch photos and explore photos from other enthusiasts. From Seiko to Rolex, no affiliate links, just watch photos.',
  alternates: {
    canonical: 'https://watchems.com',
  },
  openGraph: {
    type: 'website',
    siteName: 'Watchems',
    title: 'Watch Photo Gallery | Watchems',
    description: 'Community watch photo gallery. Browse and upload watch photos at every price point. From affordable to luxury watches.',
    url: 'https://watchems.com',
    images: [{ url: 'https://watchems.com/api/og?title=Watchems&subtitle=Watch+Photo+Gallery', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Watch Photo Gallery | Watchems',
    description: 'Community watch photo gallery. Browse and upload watch photos at every price point.',
  },
}

export default async function HomePage() {
  return (
    <>
      {/* JSON-LD Schemas */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />

      <div className="min-h-screen">
        <Suspense>
          <HeroSearch />
          <PhotoGallery />
        </Suspense>
      </div>
      <UploadNudge />
    </>
  )
}
