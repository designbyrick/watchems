// Browser-side Sentry. No-op unless NEXT_PUBLIC_SENTRY_DSN is set at build time.
// No session replay — errors plus a 10% sample of performance traces only.
// The SDK is loaded lazily so it stays out of the initial JS bundle (~70 kB);
// errors thrown before it finishes loading are not reported.
type SentryModule = typeof import('@sentry/nextjs')

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
let sentry: SentryModule | undefined

if (dsn) {
  void import('@sentry/nextjs').then((mod) => {
    mod.init({
      dsn,
      environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
      tracesSampleRate: 0.1,
    })
    sentry = mod
  })
}

export function onRouterTransitionStart(
  ...args: Parameters<SentryModule['captureRouterTransitionStart']>
) {
  sentry?.captureRouterTransitionStart(...args)
}
