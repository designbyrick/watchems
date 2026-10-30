import { MetadataRoute } from 'next'

export const dynamic = 'force-static'

// Crawlers obey only the most specific matching group, so every group must
// carry the same disallow list — otherwise a named bot gets full access.
const allow = ['/', '/api/og']
const disallow = ['/api/', '/admin', '/dashboard', '/sign-in', '/sign-up', '/private']

const AI_BOTS = ['GPTBot', 'ClaudeBot', 'Claude-Web', 'anthropic-ai', 'PerplexityBot', 'CCBot', 'Google-Extended']

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow, disallow },
      { userAgent: AI_BOTS, allow, disallow },
    ],
    sitemap: [
      'https://watchems.com/sitemap.xml',
      'https://watchems.com/image-sitemap.xml',
    ],
    host: 'https://watchems.com',
  }
}
