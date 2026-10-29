import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import Script from 'next/script'
import { ClerkProvider } from '@clerk/nextjs'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'

const hasClerk = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
  display: 'swap',
})

const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
  display: 'swap',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export const metadata: Metadata = {
  metadataBase: new URL('https://watchems.com'),
  title: {
    default: 'Watchems - Head-to-Head Watch Comparisons & Reviews',
    template: '%s | Watchems',
  },
  description:
    'Community-driven watch comparisons, honest reviews, and personalized recommendations. Compare any two watches side-by-side with real community ratings.',
  keywords: ['watch comparison', 'compare watches', 'rolex vs omega', 'seiko vs hamilton', 'rolex vs tudor', 'best watches 2026', 'watch reviews', 'watch recommendations', 'best watches under 500', 'head to head watch comparison'],
  openGraph: {
    type: 'website',
    siteName: 'Watchems',
    title: 'Watchems - Head-to-Head Watch Comparisons & Reviews',
    description: 'Community-driven watch comparisons, honest reviews, and personalized recommendations.',
    url: 'https://watchems.com',
    images: [{ url: 'https://watchems.com/api/og?title=Watchems&subtitle=Head-to-Head+Watch+Comparisons+%26+Reviews', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Watchems - Head-to-Head Watch Comparisons & Reviews',
    description: 'Community-driven watch comparisons, honest reviews, and personalized recommendations.',
    images: ['https://watchems.com/api/og?title=Watchems&subtitle=Head-to-Head+Watch+Comparisons+%26+Reviews'],
  },
  verification: {
    google: 'uJXK23x_lAigHXvAoywJqmmZAaZXeEpAntrOo_KV4gM',
  },
}

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Watchems',
  url: 'https://watchems.com',
  logo: 'https://watchems.com/logo.svg',
  description: 'Community watch photo gallery. Real wrist shots from real owners — browse by brand, style, and price.',
  sameAs: [],
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        {/* Bootstrap dataLayer immediately so gtag() calls before the GA script
            loads are queued rather than lost — prevents (not set) attribution.
            Do NOT call gtag('config') here — the Script tag below handles that
            when the library loads, avoiding a duplicate page_view. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());`,
          }}
        />
      </head>
      <body className="bg-canvas text-ink antialiased min-h-screen flex flex-col">
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-T077JWH4E5"
          strategy="afterInteractive"
        />
        <Script id="ga4-config" strategy="afterInteractive">
          {`gtag('config','G-T077JWH4E5');`}
        </Script>
        <Navigation />
        <main className="flex-1">{children}</main>
        <Footer />
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  if (hasClerk) {
    return (
      <ClerkProvider
        appearance={{
          elements: {
            footer: {
              '&::after': {
                content: '"By signing up, you agree to our Terms of Use and Privacy Policy."',
                display: 'block',
                fontSize: '11px',
                color: '#aaa',
                textAlign: 'center',
                marginTop: '8px',
                marginBottom: '16px',
                lineHeight: '1.4',
                padding: '0 24px',
              },
            },
          },
        }}
      >
        <Shell>{children}</Shell>
      </ClerkProvider>
    )
  }
  return <Shell>{children}</Shell>
}
