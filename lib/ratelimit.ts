import { Ratelimit } from '@upstash/ratelimit'
import { getRedis } from '@/lib/redis'
import { NextRequest } from 'next/server'

type Duration = Parameters<typeof Ratelimit.slidingWindow>[1]

const isProduction =
  process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'

let warnedMissingRedis = false

/**
 * Result when Redis is not configured: fail closed in production (so a
 * misconfigured deploy can't be abused for free Gemini calls / spam), allow in dev.
 */
function unconfiguredResult() {
  if (isProduction) {
    if (!warnedMissingRedis) {
      warnedMissingRedis = true
      console.error('[ratelimit] Upstash Redis is not configured — rejecting rate-limited requests')
    }
    return { success: false as const }
  }
  return { success: true as const }
}

const limiters = new Map<string, Ratelimit>()

/** Lazily create one Ratelimit per prefix and reuse it across requests. */
function getLimiter(prefix: string, tokens: number, window: Duration): Ratelimit | null {
  const existing = limiters.get(prefix)
  if (existing) return existing
  const redis = getRedis()
  if (!redis) return null
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(tokens, window),
    prefix,
  })
  limiters.set(prefix, limiter)
  return limiter
}

export function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')
    ?? '127.0.0.1'
}

/** Photo submissions: 5 per hour per user. */
export async function checkRateLimit(userId: string) {
  const limiter = getLimiter('ratelimit:submit', 5, '1 h')
  if (!limiter) return unconfiguredResult()
  return limiter.limit(userId)
}

/** Gemini watch identification: 20 per hour per user (separate from uploads). */
export async function checkIdentifyRateLimit(userId: string) {
  const limiter = getLimiter('ratelimit:identify', 20, '1 h')
  if (!limiter) return unconfiguredResult()
  return limiter.limit(userId)
}

/**
 * IP-based rate limiter for public read endpoints.
 * 60 requests per minute per IP.
 *
 * Fails open: browsing the gallery is harmless, so if Redis is missing or
 * unreachable visitors still get photos instead of a broken page.
 */
export async function checkReadRateLimit(request: NextRequest) {
  const limiter = getLimiter('ratelimit:read', 60, '1 m')
  if (!limiter) return { success: true as const }
  try {
    return await limiter.limit(getClientIp(request))
  } catch (error) {
    console.error('[ratelimit] read limiter unavailable, allowing request:', error)
    return { success: true as const }
  }
}

/** Public quiz email subscribe: 5 per 10 minutes per IP. */
export async function checkSubscribeRateLimit(request: NextRequest) {
  const limiter = getLimiter('ratelimit:subscribe', 5, '10 m')
  if (!limiter) return unconfiguredResult()
  return limiter.limit(getClientIp(request))
}
