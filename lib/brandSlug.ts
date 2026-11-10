import { toWatchSlug } from '@/lib/normalizeWatch'

/** Canonical URL slug for a brand name: "Grand Seiko" → "grand-seiko" */
export function brandSlug(brandName: string): string {
  return toWatchSlug(brandName)
}

/** Canonical path for a brand hub page */
export function brandPath(brandName: string): string {
  return `/brand/${brandSlug(brandName)}`
}
