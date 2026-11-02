/**
 * Thin event helper — sends each event to GA4 and PostHog.
 * Wraps window.gtag so callers don't need to guard against SSR or
 * ad-blockers — it fails silently if gtag isn't available.
 */
import { withPostHog } from '@/lib/posthog'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean | null | undefined>
) {
  if (typeof window === 'undefined') return
  withPostHog((posthog) => posthog.capture(eventName, params))
  if (typeof window.gtag !== 'function') return
  window.gtag('event', eventName, params)
}
