import { clerkMiddleware } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Redirect legacy root-level comparison URLs to /compare/ equivalents.
 * e.g. /rolex-air-king-vs-explorer/ → 301 → /compare/rolex-air-king-vs-explorer
 * This recovers SEO value from old indexed pages before the migration to /compare/ routes.
 */
function legacyRootLevelRedirect(req: NextRequest): NextResponse | null {
  const { pathname } = req.nextUrl
  
  // Match pattern: /{slug1}-vs-{slug2}/ at root level
  // Exclude /compare/, /watches/, /about/, /quiz/, /api/, /admin/, /sign-in/, /sign-up/
  const reservedPaths = ['/compare', '/watches', '/about', '/quiz', '/api', '/admin', '/sign-in', '/sign-up', '/_next']
  if (reservedPaths.some(p => pathname.startsWith(p))) return null
  
  const match = pathname.match(/^\/([a-z0-9\-]+)-vs-([a-z0-9\-]+)\/?$/)
  if (!match) return null
  
  const slug1 = match[1]
  const slug2 = match[2]
  
  const url = req.nextUrl.clone()
  url.pathname = `/compare/${slug1}-vs-${slug2}`
  return NextResponse.redirect(url, { status: 301 })
}

/**
 * Canonicalize /compare/ URLs so both slug orderings resolve to a single URL.
 * e.g. /compare/rolex-sub-vs-omega-sm → 301 → /compare/omega-sm-vs-rolex-sub
 * This prevents duplicate-content indexing issues in Google Search Console.
 */
function compareCanonicalRedirect(req: NextRequest): NextResponse | null {
  const { pathname } = req.nextUrl
  const match = pathname.match(/^\/compare\/(.+)$/)
  if (!match) return null

  const slug = match[1]
  const vsIdx = slug.indexOf('-vs-')
  if (vsIdx === -1) return null

  const slug1 = slug.slice(0, vsIdx)
  const slug2 = slug.slice(vsIdx + 4)

  // Sort the two slugs lexicographically — this is the canonical order
  const [canonical1, canonical2] = [slug1, slug2].sort()

  // Already canonical — no redirect needed
  if (slug1 === canonical1) return null

  const url = req.nextUrl.clone()
  url.pathname = `/compare/${canonical1}-vs-${canonical2}`
  return NextResponse.redirect(url, { status: 301 })
}

/**
 * Per-request Content-Security-Policy with a nonce (official Next.js pattern).
 * Only scripts carrying this nonce — and scripts they load ('strict-dynamic') —
 * can run, so injected inline <script> tags are blocked. The host allowlists
 * stay as a fallback for browsers without 'strict-dynamic' support.
 * This is the single source of the CSP header; the other security headers
 * live in next.config.mjs.
 */
function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === 'development'
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''} https://www.googletagmanager.com https://va.vercel-scripts.com https://clerk.watchems.com https://challenges.cloudflare.com`,
    "style-src 'self' 'unsafe-inline' https://api.fontshare.com",
    "font-src 'self' https://api.fontshare.com",
    "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com https://pub-5454588e96dd48eea58ff55965bbe8f5.r2.dev https://img.clerk.com https://images.unsplash.com",
    "connect-src 'self' https://*.clerk.accounts.dev https://clerk.watchems.com https://api.clerk.com https://cdn.vercel-insights.com https://vitals.vercel-analytics.com https://www.google-analytics.com https://www.googletagmanager.com https://challenges.cloudflare.com https://*.sentry.io",
    "frame-src 'self' https://*.clerk.accounts.dev https://clerk.watchems.com https://challenges.cloudflare.com",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join('; ')
}

export default clerkMiddleware((_auth, req) => {
  // 1. Legacy root-level comparison URL redirect (redirect old indexed URLs)
  const legacyRedirect = legacyRootLevelRedirect(req)
  if (legacyRedirect) return legacyRedirect

  // 2. Comparison slug canonicalization (runs before Clerk so bots get clean 301s)
  const canonicalRedirect = compareCanonicalRedirect(req)
  if (canonicalRedirect) return canonicalRedirect

  // 3. Attach the CSP. Next.js reads the nonce from the request's CSP header and
  //    applies it to its own scripts; app/layout.tsx reads `x-nonce` for ours.
  const nonce = btoa(crypto.randomUUID())
  const csp = buildCsp(nonce)

  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)

  const res = NextResponse.next({ request: { headers: requestHeaders } })
  res.headers.set('Content-Security-Policy', csp)
  return res
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
