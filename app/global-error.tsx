'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

// Last-resort error boundary: replaces the root layout when it crashes, so it
// must render its own <html>/<body> and can't rely on Tailwind's layout shell.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', textAlign: 'center', padding: '4rem 1rem' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Something went wrong</h1>
        <p style={{ color: '#666', marginBottom: '1.5rem' }}>
          We&apos;ve been notified and are looking into it.
        </p>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- full reload is intended after a root crash */}
        <a href="/" style={{ color: '#111', textDecoration: 'underline' }}>Back to Watchems</a>
      </body>
    </html>
  )
}
