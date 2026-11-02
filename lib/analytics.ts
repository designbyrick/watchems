/**
 * Thin event helper — sends each event to PostHog.
 * Safe to call during SSR or when PostHog is off or blocked; it fails silently.
 */
import { withPostHog } from '@/lib/posthog'

export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean | null | undefined>
) {
  if (typeof window === 'undefined') return
  withPostHog((posthog) => posthog.capture(eventName, params))
}
