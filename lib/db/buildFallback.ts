/**
 * ISR index pages are prerendered at build time. CI (and local builds) run
 * against a stub DATABASE_URL, so an unreachable DB there yields an empty list
 * instead of failing the build; the first ISR revalidation fills the page in.
 * Outside the build the error is rethrown, so ISR keeps serving the last good
 * page instead of caching an empty one.
 */
export async function emptyIfNoDbAtBuild<T>(query: PromiseLike<T[]>, label: string): Promise<T[]> {
  try {
    return await query
  } catch (err) {
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      console.warn(`[${label}] DB unavailable during build, rendering an empty list`)
      return []
    }
    throw err
  }
}
