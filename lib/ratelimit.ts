import { Ratelimit } from '@upstash/ratelimit'
import { getRedis } from '@/lib/redis'
import { NextRequest } from 'next/server'

export async function checkRateLimit(userId: string) {
  const redis = getRedis()
  if (!redis) return { success: true as const }
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 h'),
    prefix: 'ratelimit:submit',
  })
  return limiter.limit(userId)
}

/**
 * AI watch identification limiter, separate from submissions so retries
 * don't block the user from submitting. 20 requests per hour per user.
 */
export async function checkIdentifyRateLimit(userId: string) {
  const redis = getRedis()
  if (!redis) return { success: true as const }
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '1 h'),
    prefix: 'ratelimit:identify',
  })
  return limiter.limit(userId)
}

/**
 * IP-based rate limiter for public read endpoints.
 * 60 requests per minute per IP.
 */
export async function checkReadRateLimit(request: NextRequest) {
  const redis = getRedis()
  if (!redis) return { success: true as const }
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')
    ?? '127.0.0.1'
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, '1 m'),
    prefix: 'ratelimit:read',
  })
  return limiter.limit(ip)
}
