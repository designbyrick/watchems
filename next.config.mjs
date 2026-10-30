import { withSentryConfig } from '@sentry/nextjs/config'

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
      {
        protocol: 'https',
        hostname: 'pub-5454588e96dd48eea58ff55965bbe8f5.r2.dev',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  async headers() {
    // Content-Security-Policy is set per request (with a nonce) in middleware.ts.
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      // Immutable cache for Next.js static assets (hashed filenames)
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // Long-lived cache for public images and fonts
      {
        source: '/images/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/fonts/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ]
  },
  async redirects() {
    return [
      {
        source: '/compare',
        destination: '/',
        permanent: true,
      },
      {
        source: '/compare/:slug*',
        destination: '/',
        permanent: true,
      },
      {
        source: '/guides',
        destination: '/',
        permanent: true,
      },
      {
        source: '/guides/:slug*',
        destination: '/',
        permanent: true,
      },
      {
        source: '/quiz',
        destination: '/',
        permanent: true,
      },
      {
        source: '/quiz/:slug*',
        destination: '/',
        permanent: true,
      },
      // www→non-www canonical redirect (GSC SEO fix)
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'www\\.watchvswatch\\.com',
          },
        ],
        destination: 'https://watchvswatch.com/:path*',
        permanent: true,
      },
      // Blog retired — redirect all /blog/* to homepage
      {
        source: '/blog',
        destination: '/',
        permanent: true,
      },
      {
        source: '/blog/:slug',
        destination: '/',
        permanent: true,
      },
      // Rankings retired — redirect to homepage
      {
        source: '/rankings',
        destination: '/',
        permanent: true,
      },
      // Reviews retired — redirect to homepage
      {
        source: '/reviews',
        destination: '/',
        permanent: true,
      },
    ]
  },
};

// Sentry wraps the build. Runtime reporting is a no-op without a DSN (see
// sentry.*.config.ts); source maps are only uploaded when SENTRY_AUTH_TOKEN exists.
const hasSentryAuth = !!process.env.SENTRY_AUTH_TOKEN

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  telemetry: false,
  widenClientFileUpload: hasSentryAuth,
  sourcemaps: {
    disable: !hasSentryAuth,
    deleteSourcemapsAfterUpload: true,
  },
  release: {
    create: hasSentryAuth,
    finalize: hasSentryAuth,
  },
  webpack: {
    // No session replay, so drop its code from the browser bundle.
    treeshake: {
      removeDebugLogging: true,
      excludeReplayIframe: true,
      excludeReplayShadowDOM: true,
      excludeReplayCompressionWorker: true,
    },
  },
});
