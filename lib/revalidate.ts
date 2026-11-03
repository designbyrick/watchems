import { revalidatePath } from 'next/cache'

/**
 * Refreshes the static/ISR public pages after a photo is approved, rejected,
 * edited, cropped, reordered or deleted, so the change shows up right away
 * instead of after the 5-minute revalidate window. One photo feeds related
 * grids, counts and hub pages across the site, so every page under the root
 * layout is marked stale; each one re-renders on its next visit.
 */
export function revalidatePublicPages() {
  revalidatePath('/', 'layout')
}
