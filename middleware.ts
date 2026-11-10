import { clerkMiddleware } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
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

export default clerkMiddleware((_auth, req) => {
  // Only activate Clerk middleware when the keys are present (e.g. in production).
  // Without this guard, every request fails with MIDDLEWARE_INVOCATION_FAILED when
  // the Clerk env vars are not set.
  const hasClerk =
    !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    !!process.env.CLERK_SECRET_KEY

  // 1. Legacy root-level comparison URL redirect (redirect old indexed URLs)
  const legacyRedirect = legacyRootLevelRedirect(req)
  if (legacyRedirect) return legacyRedirect

  // 2. Comparison slug canonicalization (runs before Clerk so bots get clean 301s)
  const canonicalRedirect = compareCanonicalRedirect(req)
  if (canonicalRedirect) return canonicalRedirect

  // 3. Brand slug canonicalization (case/space variants → lowercase hyphenated slug)
  const brandRedirect = brandCanonicalRedirect(req)
  if (brandRedirect) return brandRedirect

  // 4. Proceed to next middleware/route
  if (!hasClerk) return NextResponse.next()
  return NextResponse.next()
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
