import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import Script from 'next/script'
import { ClerkProvider } from '@clerk/nextjs'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import MobileTabBar from '@/components/MobileTabBar'

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
  // Lets env(safe-area-inset-bottom) report the iOS home-indicator inset for the mobile tab bar
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  metadataBase: new URL('https://watchems.com'),
  title: {
    default: 'Watchems — Real Wrist Shots of Watches from Real Owners',
    template: '%s | Watchems',
  },
  description:
    'A visual library of real wrist shots submitted by watch owners. Browse Rolex, Omega, Seiko, Tudor and more by brand, model, style and price — see how a watch really looks on the wrist.',
  keywords: ['watch wrist shots', 'wrist shots', 'watch photos', 'watches on the wrist', 'real watch photos', 'watch photo gallery', 'owner watch photos', 'wrist check'],
  openGraph: {
    type: 'website',
    siteName: 'Watchems',
    title: 'Watchems — Real Wrist Shots of Watches from Real Owners',
    description: 'A visual library of real wrist shots submitted by watch owners. Browse by brand, model, style and price.',
    url: 'https://watchems.com',
    images: [{ url: 'https://watchems.com/api/og?title=Watchems&subtitle=Real+Wrist+Shots+from+Real+Owners', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Watchems — Real Wrist Shots of Watches from Real Owners',
    description: 'A visual library of real wrist shots submitted by watch owners. Browse by brand, model, style and price.',
    images: ['https://watchems.com/api/og?title=Watchems&subtitle=Real+Wrist+Shots+from+Real+Owners'],
  },
  verification: {
    google: 'uJXK23x_lAigHXvAoywJqmmZAaZXeEpAntrOo_KV4gM',
  },
}

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': 'https://watchems.com/#organization',
  name: 'Watchems',
  url: 'https://watchems.com',
  // Same raster logo as the home page's Organization block so Google sees one consistent entity
  logo: 'https://watchems.com/icon.png',
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
        <MobileTabBar />
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
