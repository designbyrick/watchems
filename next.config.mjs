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
    const isDev = process.env.NODE_ENV === 'development'
    const csp = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://www.googletagmanager.com https://va.vercel-scripts.com https://clerk.watchems.com https://challenges.cloudflare.com`,
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self'",
      "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com https://pub-5454588e96dd48eea58ff55965bbe8f5.r2.dev https://img.clerk.com https://images.unsplash.com",
      "connect-src 'self' https://*.clerk.accounts.dev https://clerk.watchems.com https://api.clerk.com https://cdn.vercel-insights.com https://vitals.vercel-analytics.com https://www.google-analytics.com https://www.googletagmanager.com https://challenges.cloudflare.com",
      "frame-src 'self' https://*.clerk.accounts.dev https://clerk.watchems.com https://challenges.cloudflare.com",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join('; ')

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
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

export default nextConfig;
