import { revalidatePath } from 'next/cache'

/**
 * Public pages are ISR-cached for a day (see the `force-static` pages in app/).
 * Wrap API handlers that change what those pages show (approve/reject/delete/crop/edit
 * photos) so a successful write purges the cache right away instead of waiting a day.
 */
export function withPublicRevalidate<A extends unknown[], R extends Response>(
  handler: (...args: A) => Promise<R>
): (...args: A) => Promise<R> {
  return async (...args: A) => {
    const res = await handler(...args)
    if (res.ok) revalidatePath('/', 'layout')
    return res
  }
}
