/**
 * Browser-side PostHog. No-op unless NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN is set.
 * The SDK is loaded lazily (like Sentry in instrumentation-client.ts) so it stays
 * out of the initial JS bundle; calls made before it loads are queued.
 * Events go through the first-party /wmx rewrite in next.config.mjs, so the CSP's
 * connect-src 'self' covers them and domain-based blockers don't drop them.
 */
type PostHog = typeof import('posthog-js').default

const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST

let client: PostHog | undefined
const queue: ((posthog: PostHog) => void)[] = []
const MAX_QUEUE = 50

export function initPostHog() {
  if (!token || !host || typeof window === 'undefined') return
  void import('posthog-js').then(({ default: posthog }) => {
    posthog.init(token, {
      api_host: '/wmx',
      // Links from the toolbar back to the PostHog app (eu.i.posthog.com → eu.posthog.com)
      ui_host: host.replace('.i.posthog.com', '.posthog.com'),
      defaults: '2026-08-30',
    })
    client = posthog
    queue.splice(0).forEach((fn) => fn(posthog))
  })
}

/** Runs `fn` with the PostHog client now, or once it has loaded. */
export function withPostHog(fn: (posthog: PostHog) => void) {
  if (!token || typeof window === 'undefined') return
  if (client) fn(client)
  else if (queue.length < MAX_QUEUE) queue.push(fn)
}
