/**
 * DB query for a `force-static` page that has no dynamic segment, so Next prerenders it at
 * build time. GitHub Actions CI builds with a stub DATABASE_URL: there (build phase, not on
 * Vercel) fall back to an empty list so the build check passes. Vercel builds and runtime ISR
 * rethrow, so a DB outage fails loudly instead of caching an empty page for a day.
 */
export async function staticQuery<T>(query: () => PromiseLike<T[]>): Promise<T[]> {
  try {
    return await query()
  } catch (err) {
    if (process.env.NEXT_PHASE === 'phase-production-build' && !process.env.VERCEL) {
      console.warn('[staticQuery] DB unavailable during CI build, rendering an empty list')
      return []
    }
    throw err
  }
}
