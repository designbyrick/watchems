import { clerkMiddleware } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { brandSlug } from '@/lib/brandSlug'

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
 *
 * Pass `null` for ISR pages: their cached HTML is built without a request, so
 * it carries no nonce and would be fully blocked by 'strict-dynamic'. Those
 * get the host allowlist plus 'unsafe-inline' instead.
 */
function buildCsp(nonce: string | null): string {
  const isDev = process.env.NODE_ENV === 'development'
  const scriptSources = nonce ? `'nonce-${nonce}' 'strict-dynamic'` : "'unsafe-inline'"
  return [
    "default-src 'self'",
    `script-src 'self' ${scriptSources}${isDev ? " 'unsafe-eval'" : ''} https://www.googletagmanager.com https://va.vercel-scripts.com https://clerk.watchems.com https://challenges.cloudflare.com`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
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

/**
 * Canonicalize /brand/ URLs to the lowercase hyphenated slug.
 * e.g. /brand/Grand%20Seiko → 301 → /brand/grand-seiko
 * Keeps one indexable URL per brand regardless of how links were cased/encoded.
 */
function brandCanonicalRedirect(req: NextRequest): NextResponse | null {
  const match = req.nextUrl.pathname.match(/^\/brand\/([^/]+)\/?$/)
  if (!match) return null

  let raw: string
  try {
    raw = decodeURIComponent(match[1])
  } catch {
    return null
  }
  const slug = brandSlug(raw)
  if (!slug || slug === match[1]) return null

  const url = req.nextUrl.clone()
  url.pathname = `/brand/${slug}`
  return NextResponse.redirect(url, { status: 301 })
}

/**
 * Soft-deleted photos answer 410 Gone so Google drops them from the index.
 * App Router pages can't set a 410 status themselves (only notFound()/redirect()),
 * so the status lookup happens here. Any lookup failure falls through to the page.
 */
async function deletedPhotoGone(req: NextRequest): Promise<NextResponse | null> {
  const match = req.nextUrl.pathname.match(/^\/photo\/([^/]+)\/?$/)
  if (!match || !process.env.DATABASE_URL) return null

  let param: string
  try {
    param = decodeURIComponent(match[1])
  } catch {
    return null
  }

  try {
    const sql = neon(process.env.DATABASE_URL, { fetchOptions: { cache: 'no-store' } })
    const rows = await sql`select status from photos where slug = ${param} or id = ${param} limit 1`
    if (rows[0]?.status !== 'deleted') return null
  } catch {
    return null
  }

  return new NextResponse(
    '<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><title>Photo removed</title><p>This photo has been removed. <a href="/">Back to the gallery</a></p>',
    {
      status: 410,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex' },
    }
  )
}

/** Routes rendered with `dynamic = 'force-static'` + ISR (app/page.tsx, app/page/[n]/page.tsx) */
function isStaticGalleryPath(pathname: string): boolean {
  return pathname === '/' || /^\/page\/\d+\/?$/.test(pathname)
}

async function handle(req: NextRequest): Promise<NextResponse> {
  // 1. Legacy root-level comparison URL redirect (redirect old indexed URLs)
  const legacyRedirect = legacyRootLevelRedirect(req)
  if (legacyRedirect) return legacyRedirect

  // 2. Comparison slug canonicalization (runs before Clerk so bots get clean 301s)
  const canonicalRedirect = compareCanonicalRedirect(req)
  if (canonicalRedirect) return canonicalRedirect

  // 3. Brand slug canonicalization (case/space variants → lowercase hyphenated slug)
  const brandRedirect = brandCanonicalRedirect(req)
  if (brandRedirect) return brandRedirect

  // 4. Soft-deleted photo pages → 410 Gone
  const gone = await deletedPhotoGone(req)
  if (gone) return gone

  // 5. Attach the CSP. ISR pages (gallery home + /page/N) are served from a
  //    static cache, so they can't carry a per-request nonce.
  if (isStaticGalleryPath(req.nextUrl.pathname)) {
    const res = NextResponse.next()
    res.headers.set('Content-Security-Policy', buildCsp(null))
    return res
  }

  // Next.js reads the nonce from the request's CSP header and applies it to
  // its own scripts; app/layout.tsx reads `x-nonce` for ours.
  const nonce = btoa(crypto.randomUUID())
  const csp = buildCsp(nonce)

  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)

  const res = NextResponse.next({ request: { headers: requestHeaders } })
  res.headers.set('Content-Security-Policy', csp)
  return res
}

// Clerk throws on every request when its keys are missing (e.g. Preview
// deployments without Clerk env vars), so only wrap the handler when they exist.
const hasClerk = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && !!process.env.CLERK_SECRET_KEY

export default hasClerk ? clerkMiddleware((_auth, req) => handle(req)) : handle

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
