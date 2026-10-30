import * as Sentry from '@sentry/nextjs'

// Loads the Sentry config for the runtime this request runs in. Each config is
// a no-op when SENTRY_DSN is not set, so local dev and CI need no account.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

// Reports errors thrown in server components, route handlers and middleware.
export const onRequestError = Sentry.captureRequestError
