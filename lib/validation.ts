/** Validates that a slug/watchId contains only safe characters (a-z, 0-9, hyphens). */
export function isValidSlug(value: string): boolean {
  return /^[a-z0-9][a-z0-9-]{0,120}$/.test(value)
}

/** Sanitizes a text string: trims, removes control characters, enforces max length. */
export function sanitizeText(value: string, maxLength: number): string {
  // eslint-disable-next-line no-control-regex
  return value.trim().replace(/[\x00-\x1F\x7F]/g, '').slice(0, maxLength)
}

/** Escapes LIKE/ILIKE wildcards (`%`, `_`) and the escape char (`\`) so user input matches literally. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&')
}

/** Parses an integer query param; returns null when missing or not a finite number. */
export function parseIntParam(value: string | null): number | null {
  if (value === null || value.trim() === '') return null
  const n = parseInt(value, 10)
  return Number.isFinite(n) ? n : null
}

/**
 * Slugs of guides that render a VotableRankingTable (static pages under app/buying-guide/under-*,
 * each passing `slug` via BuyingGuideTemplate). Keep in sync when a new votable guide page is added.
 */
export const VOTABLE_GUIDE_SLUGS: ReadonlySet<string> = new Set(['under-100', 'under-500', 'under-1000'])

/** Validates a guide vote key: `${brand}:${model}` lowercased, as built by VotableRankingTable. */
export function isValidWatchKey(value: string): boolean {
  if (value.length === 0 || value.length > 120) return false
  if (value !== value.toLowerCase()) return false
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1F\x7F]/.test(value)) return false
  const parts = value.split(':')
  return parts.length === 2 && parts[0].trim() !== '' && parts[1].trim() !== ''
}
