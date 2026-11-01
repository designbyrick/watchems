import { revalidatePath } from 'next/cache'

/**
 * Purge the ISR cache of every public page that lists approved photos, so a
 * moderation change (approve, reject, delete, edit, crop, reorder) shows up
 * right away instead of after the page's `revalidate` window.
 */
export function revalidateCatalog() {
  for (const route of ['/page/[n]', '/photo/[id]', '/w/[watchId]', '/brand/[brand]', '/style/[style]']) {
    revalidatePath(route, 'page')
  }
  for (const path of ['/', '/watches', '/brands', '/styles', '/sitemap.xml', '/image-sitemap.xml']) {
    revalidatePath(path)
  }
}
